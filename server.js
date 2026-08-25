require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const pdfController = require('./pdfController');
const notionService = require('./notionService');

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ------------------------
// OPTIMIZACIÓN DE CUOTA Y CACHÉ
// ------------------------

const responseCache = new Map();
const MAX_CACHE_SIZE = 50;

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

TABLA DE PRECIOS:
IMPRESIÓN B/N (carta): 1-50 págs = RD$2.50/pág | 51-200 = RD$2.00 | 201+ = RD$1.75
IMPRESIÓN COLOR (carta): 1-50 = RD$15 | 51-200 = RD$10 | 201+ = RD$8
ENCUADERNADO ESPIRAL: 1-100 págs = RD$60 | 101-160 = RD$70 | 161-220 = RD$80 | 221-300 = RD$100 | 301-400 = RD$150 | 401-500 = RD$200 | 501+ = RD$250
EMPASTADO TAPA DURA: colores estándar = RD$500 | blanco/beige = RD$600
PAPEL HILO (tesis): +RD$1.00 extra por página sobre precio base
PAPEL SATINADO: +RD$2.00 extra por página
CD ROTULADO: RD$150
ROTULACIÓN DE LOMO: RD$50
PLASTIFICADO: RD$25/hoja carta | RD$40/hoja tabloide
PLOTEO: Cartonite RD$80/pie² | Fotográfico RD$160/pie² | Lona RD$100/pie² | Canvas RD$300/pie²

REGLAS:
- Responde siempre en español dominicano, informal y directo.
- Cuando calcules un precio, muéstralo claramente al final con el formato: TOTAL: RD$X,XXX
- Si faltan datos para calcular, pregunta solo lo esencial en una sola pregunta corta.
- Nunca inventes precios que no estén en la tabla.
- Sé breve. Máximo 3-4 líneas de respuesta.
- Si te preguntan algo que no es de impresión, redirige amablemente.`;

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

// ------------------------
// CORS & PREFLIGHT (Evita Error 405)
// ------------------------
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
    // Responder inmediatamente a peticiones de pre-vuelo OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

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

        // 2. CACHÉ DE RESPUESTAS (Para preguntas idénticas sin historial)
        const cacheKey = mensaje.toLowerCase().trim();
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
// ARCHIVOS ESTÁTICOS (Mover al final)
// ------------------------
app.use(express.static(
    path.join(__dirname, 'public')
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