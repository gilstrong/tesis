const express = require('express');
const multer = require('multer');
const path = require('path');
const pdfController = require('./pdfController'); // ✅ Importamos el controlador

const app = express();
const port = process.env.PORT || 3000;

// --- Configuración de Multer para subida de archivos ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middlewares ---
app.use(express.json({ limit: '10mb' })); // Aumentar límite para HTML grande
app.use(express.urlencoded({ extended: true })); // Para procesar datos de formularios
app.use(express.static(path.join(__dirname, 'public')));

// Evitar error 404 de favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- Ruta raíz: Servir index.html ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- Rutas delegadas al Controlador ---
app.post('/analizar-pdf', upload.single('pdf'), pdfController.analizarPDF);
app.post('/generar-pdf', pdfController.generarPDF);

// --- Middleware de manejo de errores global ---
app.use((err, req, res, next) => {
    console.error('Error global:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- Iniciar Servidor ---
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log(`📁 Frontend servido desde: ${path.join(__dirname, 'public')}`);
    console.log(`⚠️  No abras el archivo index.html directamente. Usa la dirección de arriba.`);
});