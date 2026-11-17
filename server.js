require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { DEFAULTS: DEFAULT_PRICE_CATALOG, buildCatalog, validate: validatePriceCatalog } = require('./public/pricing-config');

// Inicialización consolidada y robusta de Firebase Admin SDK
const { admin, db } = require('./config/firebase');

const pdfController = require('./tesis/pdfController');
const notionService = require('./tesis/notionService');

const app = express();
// Confiar en el proxy (1 nivel para Render/proxies inversos para obtener la IP real)
app.set('trust proxy', 1);

const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ------------------------
// OPTIMIZACIÓN DE CUOTA Y CACHÉ
// ------------------------

const responseCache = new Map();
const MAX_CACHE_SIZE = 50;
const PRICE_CACHE_MS = 5000;
let cachedPriceCatalog = null;
let cachedPriceCatalogAt = 0;

// Diccionario de respuestas rápidas para ahorrar API
const STATIC_RESPONSES = {
    'hola': '¡Hola! 👋 Soy tu asistente de ServiGaco. Puedo ayudarte con precios de impresión, tesis y ploteos. ¿Qué deseas cotizar?',
    'gracias': '¡De nada! Es un placer ayudarte. 😊',
    'ok': '¡Entendido! Avísame si necesitas algo más.',
    'si': 'Perfecto, cuéntame los detalles.',
    'no': 'Entiendo. ¿Hay algo más en lo que pueda apoyarte?',
    'buenos dias': '¡Buenos días! ☀️ ¿En qué puedo ayudarte con tus impresiones?',
    'buenas tardes': '¡Buenas tardes! ¿Qué deseas cotizar hoy?',
    'buenas noches': '¡Buenas noches! ¿En qué puedo apoyarte?',
    'analiza': 'Para analizar un documento, por favor utiliza el botón de adjuntar (📎) o arrastra el PDF aquí mismo.'
};

/**
 * Decide si el mensaje requiere procesamiento de IA o puede responderse localmente.
 */
function getTrivialResponse(text) {
    const clean = text.toLowerCase().trim().replace(/[?¿!¡.,]/g, "");
    if (STATIC_RESPONSES[clean]) return STATIC_RESPONSES[clean];
    if (clean.length < 4) return "Entendido. ¿Tienes alguna duda específica sobre nuestros servicios de impresión?";
    return null;
}

// PROMPT DEL ASISTENTE
// ------------------------

const SYSTEM = `Eres el asistente de cotización de ServiGaco, una imprenta profesional en República Dominicana. Tu trabajo es ayudar al vendedor o cliente a calcular precios rápidamente de forma conversacional.

CAPACIDAD OPERATIVA:
- Puedes recibir análisis de PDFs (páginas, color, b/n).
- Si el PDF tiene muchas páginas (ej. > 50) o el usuario dice "tesis", asume que es una tesis.

PRECIOS:
- Consulta exclusivamente el catálogo dinámico de precios incluido en la petición.
- No uses precios memorizados, fijos ni calculados desde una tabla anterior.
- En impresión, busca el precio unitario del rango que corresponda a la cantidad y multiplícalo por las páginas.
- En tesis tamaño legal con papel hilo, suma al precio base el recargo configurado para B/N o color; aplica los precios especiales ITLA solo cuando corresponda.
- En Booklet, calcula las hojas físicas como páginas ÷ 2 redondeadas hacia arriba; suma portada solo si el cliente la solicita y multiplica por ejemplares.
- En ploteo personalizado, calcula pies cuadrados como ancho en pulgadas × alto en pulgadas ÷ 144 y usa la tarifa por pie cuadrado del material.
- Aplica el múltiplo de redondeo configurado al total de tesis.
- Si faltan datos para calcular, pregunta solo lo esencial y no inventes valores.

REGLAS:
- Responde siempre en español dominicano, informal y directo.
- Cuando calcules un precio, muéstralo claramente al final con el formato: TOTAL: RD$X,XXX
- Si faltan datos para calcular, pregunta solo lo esencial en una sola pregunta corta.
- Nunca inventes precios que no estén en la tabla.
- Sé breve. Máximo 3-4 líneas de respuesta.
- Si te preguntan algo que no es de impresión, redirige amablemente.`;

function fetchRealtimeJson(nodePath) {
    const databaseUrl = (process.env.FIREBASE_DATABASE_URL || 'https://servigaco-default-rtdb.firebaseio.com').replace(/\/+$/, '');
    const url = `${databaseUrl}/${nodePath}.json`;
    return new Promise((resolve, reject) => {
        const request = https.get(url, { timeout: 5000 }, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
                body += chunk;
                if (body.length > 200000) request.destroy(new Error('Respuesta de precios demasiado grande.'));
            });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`Firebase respondió HTTP ${response.statusCode}.`));
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(new Error(`Firebase devolvió JSON inválido: ${error.message}`));
                }
            });
        });
        request.on('timeout', () => request.destroy(new Error('Tiempo agotado al leer los precios de Firebase.')));
        request.on('error', reject);
    });
}

async function cargarCatalogoPreciosIA() {
    if (cachedPriceCatalog && Date.now() - cachedPriceCatalogAt < PRICE_CACHE_MS) {
        return cachedPriceCatalog;
    }

    const [central, legacy] = await Promise.allSettled([
        fetchRealtimeJson('config/precios_app'),
        fetchRealtimeJson('config/precios_booklet')
    ]);
    const centralData = central.status === 'fulfilled' ? central.value : null;
    const legacyData = legacy.status === 'fulfilled' ? legacy.value : null;

    if (central.status === 'rejected' && legacy.status === 'rejected') {
        console.error('[Chat IA] No se pudo leer el catálogo remoto; se usarán los valores iniciales compartidos.', {
            central: central.reason.message,
            legacy: legacy.reason.message
        });
    } else if (central.status === 'rejected') {
        console.error('[Chat IA] No se pudo leer config/precios_app:', central.reason);
    } else if (legacy.status === 'rejected') {
        console.error('[Chat IA] No se pudo leer config/precios_booklet:', legacy.reason);
    }

    const catalog = buildCatalog(centralData, legacyData);
    const validationErrors = validatePriceCatalog(catalog);
    if (validationErrors.length) {
        console.error('[Chat IA] Catálogo remoto inválido; se usarán los valores iniciales compartidos:', validationErrors);
    }
    cachedPriceCatalog = validationErrors.length ? DEFAULT_PRICE_CATALOG : catalog;
    cachedPriceCatalogAt = Date.now();
    return cachedPriceCatalog;
}

// ------------------------
// MULTER
// ------------------------

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage
});

// ------------------------
// MIDDLEWARES
// ------------------------

app.use(express.json({
    limit: '10mb'
}));

app.use(express.urlencoded({
    extended: true
}));

app.use(cookieParser());

// ------------------------
// CORS & PREFLIGHT (Soporta cookies, credentials y evita Error 405)
// ------------------------
app.use(cors({
    origin: (origin, callback) => {
        // Permite solicitudes sin encabezado Origin (móviles, curl, server-to-server)
        // o cualquier origen web reflejando el host exacto para permitir credentials: true
        callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization']
}));

// ------------------------
// FAVICON
// ------------------------

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// ------------------------
// INDEX
// ------------------------

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'public',
            'index.html'
        )
    );

});

// ------------------------
// PDF
// ------------------------

app.post('/analizar-pdf', upload.single('pdf'), (req, res, next) => {
    console.log('========== PDF REQUEST ==========');
    console.log('FILE:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    } : 'NO FILE');
    console.log('BODY:', req.body);
    
    // Pasar al controlador
    pdfController.analizarPDF(req, res);
});

app.post(
    '/generar-pdf',
    pdfController.generarPDF
);

// ------------------------
// CHAT IA
// ------------------------

app.post('/chat-ia', async (req, res) => {

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ ERROR: GEMINI_API_KEY no configurada');
        return res.status(500).json({ error: 'La IA no está configurada en el servidor (Falta Gemini API Key).' });
    }

    try {
        const { mensaje, history = [] } = req.body;

        // 1. FILTRO INTELIGENTE: ¿Realmente necesitamos IA?
        const trivial = getTrivialResponse(mensaje);
        if (trivial) {
            console.log(`💡 [AHORRO API] Respuesta local enviada para: "${mensaje}"`);
            return res.json({ reply: trivial });
        }

        const priceCatalog = await cargarCatalogoPreciosIA();
        const priceVersion = crypto.createHash('sha256').update(JSON.stringify(priceCatalog)).digest('hex');

        // 2. CACHÉ DE RESPUESTAS (Para preguntas idénticas sin historial)
        const cacheKey = `${mensaje.toLowerCase().trim()}:${priceVersion}`;
        if (history.length === 0 && responseCache.has(cacheKey)) {
            console.log('⚡ [CACHÉ] Respuesta servida desde memoria local.');
            return res.json({ reply: responseCache.get(cacheKey) });
        }

        console.log('CHAT REQUEST RECEIVED');
        console.log('MENSAJE:', mensaje);

        // 3. LIMITAR HISTORIAL (Ventana deslizante de los últimos 6 mensajes)
        const optimizedHistory = history.slice(-6);

        // Convertir historial optimizado a texto
        const historialTexto = optimizedHistory
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        // Construcción del prompt unificado
        const prompt = `
${SYSTEM}

CATÁLOGO ACTUAL DE PRECIOS (JSON):
${JSON.stringify(priceCatalog)}

HISTORIAL:
${historialTexto}

USUARIO:
${mensaje}
`;

        const MODEL = 'gemini-2.5-flash';

        console.log('API KEY EXISTS:', !!process.env.GEMINI_API_KEY);
        console.log('USANDO MODELO:', MODEL);

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: prompt
        });

        const replyText = response.text;

        // 4. GUARDAR EN CACHÉ (Si es un mensaje nuevo y la respuesta es corta)
        if (history.length === 0 && replyText.length < 500) {
            if (responseCache.size >= MAX_CACHE_SIZE) {
                const firstKey = responseCache.keys().next().value;
                responseCache.delete(firstKey);
            }
            responseCache.set(cacheKey, replyText);
        }

        res.json({
            reply: replyText
        });

    } catch (error) {
        console.error('========== GEMINI ERROR ==========');
        console.error(error);

        if (error.stack) {
            console.error(error.stack);
        }

        res.status(500).json({
            error: error.message || 'Error IA',
            details: error.toString()
        });

    }
});

// ------------------------
// NOTION API ROUTES
// ------------------------

/**
 * GET /notion/status
 * Prueba la conexión con Notion y devuelve el estado.
 */
app.get('/notion/status', async (req, res) => {
    try {
        const result = await notionService.testConnection();
        res.json(result);
    } catch (err) {
        res.status(500).json({ connected: false, error: err.message });
    }
});

/**
 * POST /notion/sync/tesis
 * Sincroniza una cotización de tesis con Notion.
 * Body: { datos: {...}, notionPageId?: string }
 */
app.post('/notion/sync/tesis', async (req, res) => {
    try {
        const { datos, notionPageId } = req.body;
        if (!datos) return res.status(400).json({ success: false, error: 'Faltan datos' });

        const result = await notionService.syncTesis(datos, notionPageId || null);
        res.json(result);
    } catch (err) {
        console.error('[Notion] Error en /notion/sync/tesis:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /notion/sync/general
 * Sincroniza una cotización general con Notion.
 * Body: { datos: {...}, notionPageId?: string }
 */
app.post('/notion/sync/general', async (req, res) => {
    try {
        const { datos, notionPageId } = req.body;
        if (!datos) return res.status(400).json({ success: false, error: 'Faltan datos' });

        const result = await notionService.syncGeneral(datos, notionPageId || null);
        res.json(result);
    } catch (err) {
        console.error('[Notion] Error en /notion/sync/general:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /notion/sync/factura
 * Sincroniza una factura con Notion.
 * Body: { datos: {...}, notionPageId?: string }
 */
app.post('/notion/sync/factura', async (req, res) => {
    try {
        const { datos, notionPageId } = req.body;
        if (!datos) return res.status(400).json({ success: false, error: 'Faltan datos' });

        const result = await notionService.syncFactura(datos, notionPageId || null);
        res.json(result);
    } catch (err) {
        console.error('[Notion] Error en /notion/sync/factura:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /notion/archivar
 * Archiva (sin eliminar) una página de Notion.
 * Body: { notionPageId: string }
 */
app.post('/notion/archivar', async (req, res) => {
    try {
        const { notionPageId } = req.body;
        if (!notionPageId) return res.status(400).json({ success: false, error: 'Falta notionPageId' });

        const result = await notionService.archivarPagina(notionPageId);
        res.json(result);
    } catch (err) {
        console.error('[Notion] Error en /notion/archivar:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ------------------------
// MONITOREO Y ANALÍTICA DE VISITANTES
// ------------------------
app.use('/api/visitors', require('./routes/visitorRoutes'));
app.use('/api', require('./routes/analyticsRoutes'));

// ------------------------
// ARCHIVOS ESTÁTICOS (Mover al final)
// ------------------------
app.use('/temp', express.static(
    path.join(__dirname, 'tesis', 'public', 'temp')
));

app.use(express.static(
    path.join(__dirname, 'public'),
    {
        maxAge: '1d',
        setHeaders(res, filePath) {
            if (['.html', '.js', '.css'].includes(path.extname(filePath).toLowerCase())) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }
));

// ------------------------
// ERROR GLOBAL
// ------------------------

app.use((err, req, res, next) => {

    console.error(
        'Error global:',
        err
    );

    if (!res.headersSent) {

        res.status(500).json({
            error:
                'Error interno del servidor'
        });

    }

});

// ------------------------
// START
// ------------------------

app.listen(port, () => {

    console.log(
        `🚀 Servidor corriendo en http://localhost:${port}`
    );

    console.log(
        `📁 Frontend servido desde: ${path.join(__dirname, 'public')}`
    );

});