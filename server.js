const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- Configuración de Multer para subida de archivos ---
// Usaremos almacenamiento en memoria para evitar I/O de disco en servicios como Render
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middlewares ---
// --- Middlewares ---
// Para poder parsear JSON en el body (para el nuevo endpoint de generación de PDF)
app.use(express.json({ limit: '10mb' })); // Aumentar límite para HTML grande
// Sirve todos los archivos del directorio raíz (index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Evitar error 404 de favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());


// --- Endpoint de la API para analizar PDF ---
app.post('/analizar-pdf', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo PDF.' });
    }

    let browser;
    try {
        console.log('Lanzando Puppeteer...');
        // Iniciar Puppeteer con argumentos para entornos de servidor
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                // '--no-zygote', // Comentado: Causa error 500 en Windows
                // '--single-process', // Comentado: Causa error 500 en Windows
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Contenido HTML para la página que ejecutará pdf.js
        const analyzerHtml = `
            <!DOCTYPE html>
            <html><head>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                <script>
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                </script>
            </head><body></body></html>
        `;
        await page.setContent(analyzerHtml);

        console.log('Analizando PDF en el backend...');
        // Pasamos el buffer del archivo a la página y ejecutamos el análisis
        const results = await page.evaluate(async (pdfBufferData) => {
            
            // Esta función se ejecuta dentro del contexto del navegador de Puppeteer
            const pdfData = new Uint8Array(Object.values(pdfBufferData));
            const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
            
            let paginasColor = 0;
            let paginasBN = 0;
            const totalPaginas = pdfDoc.numPages;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const ESCALA = 0.35;

            const pdfAnalizarCanvas = (context, ancho, alto) => {
                const imageData = context.getImageData(0, 0, ancho, alto);
                const data = imageData.data;
                const TOLERANCIA = 20;
                const paso = (data.length / 4 > 40000) ? 4 : 2;
                let pixelesColor = 0;
                let muestras = 0;

                for (let i = 0; i < data.length; i += 4 * paso) {
                    if (data[i+3] < 30 || (data[i] > 250 && data[i+1] > 250 && data[i+2] > 250)) continue;
                    const diff = Math.abs(data[i] - data[i+1]) + Math.abs(data[i] - data[i+2]) + Math.abs(data[i+1] - data[i+2]);
                    if (diff > TOLERANCIA) pixelesColor++;
                    muestras++;
                }
                return (muestras > 0 ? (pixelesColor / muestras) * 100 : 0) > 0.5;
            };

            for (let i = 1; i <= totalPaginas; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: ESCALA });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                
                if (pdfAnalizarCanvas(ctx, canvas.width, canvas.height)) paginasColor++;
                else paginasBN++;
            }

            return { total: totalPaginas, color: paginasColor, bw: paginasBN };

        }, req.file.buffer);

        console.log('Análisis completado:', results);
        res.json(results);

    } catch (error) {
        console.error('Error durante el análisis del PDF:', error);
        res.status(500).json({ error: 'Error al procesar el PDF en el servidor.' });
    } finally {
        if (browser) await browser.close();
    }
});

// --- Endpoint para generar PDF desde HTML ---
app.post('/generar-pdf', async (req, res) => {
    const { html, filename = 'documento.pdf' } = req.body;

    if (!html) {
        return res.status(400).json({ error: 'No se proporcionó contenido HTML.' });
    }

    let browser;
    try {
        console.log('Lanzando Puppeteer para generar PDF...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                // '--no-zygote',
                // '--single-process',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Es importante esperar a que todas las imágenes y recursos carguen
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(pdfBuffer);

        console.log(`PDF "${filename}" generado exitosamente.`);

    } catch (error) {
        console.error('Error durante la generación del PDF:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Error al generar el PDF en el servidor.' });
    }
});


// --- Iniciar Servidor ---
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`⚠️  No abras el archivo index.html directamente. Usa la dirección de arriba.`);
});