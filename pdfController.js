const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let browser;
let logoBase64Cache = null;

// Configuración optimizada de argumentos para Render (Más agresiva)
const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--font-render-hinting=none',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--mute-audio',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
];

// Función centralizada para iniciar el navegador
const initBrowser = async () => {
    if (browser && browser.isConnected()) return;
    try {
        console.log("🚀 Iniciando navegador Puppeteer...");
        browser = await puppeteer.launch({
            headless: true,
            args: puppeteerArgs
        });

        browser.on('disconnected', () => {
            console.error('⚠️ [CRÍTICO] BROWSER DISCONNECTED: El proceso de Chromium se ha cerrado inesperadamente.');
        });

        console.log("✅ Navegador listo.");
    } catch (e) {
        console.error("❌ Error iniciando navegador:", e);
    }
};

// Función para limpiar archivos PDF residuales en public/temp
const limpiarCarpetaTemporal = () => {
    try {
        const tempDir = path.join(__dirname, 'public', 'temp');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            let contador = 0;
            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    fs.unlinkSync(path.join(tempDir, file));
                    contador++;
                }
            }
            if (contador > 0) console.log(`🧹 Limpieza de inicio: ${contador} archivos temporales eliminados.`);
        }
    } catch (e) {
        console.error("⚠️ Advertencia en limpieza de temporales:", e.message);
    }
};

// Inicialización al arranque (Browser + Logo Caché)
(async () => {
    // 1. Limpiar archivos basura de sesiones anteriores
    limpiarCarpetaTemporal();

    // 2. Cargar Logo en memoria UNA SOLA VEZ
    try {
        // CORRECCIÓN: La ruta correcta es relativa al directorio del proyecto.
        const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) {
            const bitmap = fs.readFileSync(logoPath);
            logoBase64Cache = `data:image/png;base64,${bitmap.toString('base64')}`;
        }
    } catch (e) { console.error("Error cargando logo al inicio:", e); }

    // 3. Iniciar navegador
    await initBrowser();
})();


const analizarPDF = async (req, res) => {
    console.log('========== PDF REQUEST ==========');
    console.log('Archivo recibido:', !!req.file);
    if (req.file) {
        console.log('Nombre:', req.file.originalname);
        console.log('Tamaño:', req.file.size);
    }

    console.log('Browser exists:', !!browser);
    if (browser) {
        console.log('Browser connected:', browser.isConnected());
    }

    if (!req.file) {
        console.error('❌ Error: req.file es undefined');
        return res.status(400).json({ error: 'No se ha subido ningún archivo PDF.' });
    }

    let page = null;
    let tempFilePath = null;
    try {
        if (!browser || !browser.isConnected()) await initBrowser();
        page = await browser.newPage();
        
        console.log('Page creada');

        // Eventos de depuración solicitados
        page.on('close', () => console.error('PAGE CLOSED'));
        page.on('error', err => console.error('PAGE ERROR', err));
        page.on('pageerror', err => console.error('PAGE JS ERROR', err));

        const analyzerHtml = `
            <!DOCTYPE html>
            <html><head>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                <script>
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                </script>
            </head><body></body></html>
        `;

        await page.setContent(analyzerHtml, { waitUntil: 'networkidle0' });
        console.log('HTML cargado en Puppeteer');

        const loaded = await page.evaluate(() => !!window.pdfjsLib);
        if (!loaded) throw new Error('La librería PDF.js no pudo cargarse.');

        // 1. Guardar archivo temporal para que Puppeteer lo lea vía URL (No vía IPC)
        const tempFilename = `analisis_${Date.now()}.pdf`;
        const tempDir = path.join(__dirname, 'public', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        tempFilePath = path.join(tempDir, tempFilename);
        
        await fs.promises.writeFile(tempFilePath, req.file.buffer);
        
        const isLargePDF = req.file.size > 50 * 1024 * 1024;
        const port = process.env.PORT || 3000;
        // Usar 127.0.0.1 para asegurar tráfico local rápido
        const pdfUrl = `http://127.0.0.1:${port}/temp/${tempFilename}`;

        console.log('Analizando PDF desde URL segura:', pdfUrl);

        const results = await page.evaluate(async (url, isLarge) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch falló');
            const arrayBuffer = await res.arrayBuffer();
            const pdfData = new Uint8Array(arrayBuffer);
            const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
            
            let paginasColor = 0;
            let paginasBN = 0;
            const total = pdfDoc.numPages;

            // Definir qué páginas analizar (Muestreo para PDFs gigantes)
            let pagesToAnalyze = [];
            if (isLarge && total > 30) {
                for(let i=1; i<=10; i++) pagesToAnalyze.push(i); // Primeras 10
                const mid = Math.floor(total / 2);
                for(let i=mid-5; i<=mid+4; i++) pagesToAnalyze.push(i); // 10 centrales
                for(let i=total-9; i<=total; i++) pagesToAnalyze.push(i); // Últimas 10
                pagesToAnalyze = [...new Set(pagesToAnalyze)].sort((a,b) => a-b);
            } else {
                for(let i=1; i<=total; i++) pagesToAnalyze.push(i);
            }

            for (const i of pagesToAnalyze) {
                const page = await pdfDoc.getPage(i);
                
                // Si estamos en muestreo, escalamos el resultado proporcionalmente al final
                // Pero para simplicidad de cotización, detectamos si la muestra tiene color
                const ops = await page.getOperatorList();
                const colorOps = [window.pdfjsLib.OPS.setFillRGB, window.pdfjsLib.OPS.setStrokeRGB, window.pdfjsLib.OPS.paintJpegXObject];
                const isColor = ops.fnArray.some(op => colorOps.includes(op));
                
                if (isColor) paginasColor++; else paginasBN++;
                
                // Liberar memoria de la página
                page.cleanup();
            }

            // Si fue muestreo, el usuario debe saberlo, pero reportamos el total real
            return { 
                total: total, 
                color: isLarge ? `~${paginasColor} (Muestra)` : paginasColor, 
                bw: isLarge ? `~${paginasBN} (Muestra)` : paginasBN,
                isSampled: isLarge
            };
        }, pdfUrl, isLargePDF); // Pasamos la URL en lugar de los datos

        console.log('Análisis completado');

        console.log('Análisis completado:', results);
        res.json(results);
    } catch (error) {
        console.error('========== PDF ERROR ==========');
        res.status(500).json({ message: error.message, stack: error.stack });
    } finally {
        // Limpiar archivo temporal inmediatamente
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.promises.unlink(tempFilePath).catch(e => console.error("Error eliminando temp PDF:", e));
        }

        // Proteger el finally contra crashes por desconexión
        try {
            if (page && !page.isClosed()) {
                await page.close();
            }
        } catch (closeError) {
            console.error('Error cerrando página (ignorado para evitar crash):', closeError.message);
        }
    }
};


const generarPDF = async (req, res) => {
    let page = null;
    try {
        console.log("🔵 [PDF] Solicitud recibida. Datos:", req.body ? "OK" : "VACÍO");
        const data = req.body || {};
        
        // === MODO 1: HTML DIRECTO (Desde Frontend) ===
        if (data.html) {
            if (!browser || !browser.isConnected()) await initBrowser();
            page = await browser.newPage();
            await page.setContent(data.html, { waitUntil: 'networkidle0', timeout: 60000 });
            
            const pdfBuffer = await page.pdf({
                printBackground: true,
                preferCSSPageSize: true, // Respeta el @page (8.5in x 11in) definido en el HTML del frontend, en vez de forzar A4
                margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
            });

            const filename = data.filename || 'documento.pdf';
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`
            });
            res.end(pdfBuffer);
            console.log(`PDF "${filename}" generado desde HTML.`);
            return; // Terminamos aquí si es HTML directo
        }

        // === MODO 2: DATOS JSON (Lógica original del controlador) ===
        // 1. Preparar datos y Logo
        const logoSrc = logoBase64Cache; // Usar variable en memoria (Instantáneo)
        const { ncf, fecha, cliente, items, subtotal, impuestos, total, tituloDocumento, condicion } = data;
        
        // Validación de seguridad para evitar crash si items es undefined
        const listaItems = Array.isArray(items) ? items : [];
        const datosCliente = cliente || {};

        // 2. Construir HTML
        const rows = listaItems.map((item, i) => `
            <tr class="${i % 2 === 0 ? 'bg-gray' : ''}">
                <td class="col-desc">
                    <div class="item-name">${item.nombre || 'Item'}</div>
                    <div class="item-desc">${item.descripcion || ''}</div>
                </td>
                <td class="col-center">${item.cantidad || 0}</td>
                <td class="col-right">RD$ ${parseFloat(item.precioUnitario || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                <td class="col-right font-bold">RD$ ${parseFloat(item.precio || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');

        const impuestosHTML = (impuestos || []).map(imp => `
            <tr class="tax-row">
                <td class="label">${imp.nombre}:</td>
                <td class="value">RD$ ${parseFloat(imp.monto || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { margin: 0; size: A4; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    color: #333; 
                    font-size: 14px; 
                    line-height: 1.4; 
                    margin: 0;
                    padding: 40px; 
                    background: #fff;
                }
                
                /* Header */
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
                .company-info h1 { margin: 0; font-size: 22px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
                .company-info p { margin: 5px 0 0; font-size: 12px; color: #666; }
                .logo-img { height: 70px; width: auto; object-fit: contain; }

                /* Invoice Details */
                .invoice-details { text-align: right; }
                .invoice-title { font-size: 32px; font-weight: 900; color: #1e293b; margin: 0 0 5px 0; letter-spacing: -1px; }
                .meta-item { margin-bottom: 3px; }
                .meta-label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; margin-right: 5px; }
                .meta-value { font-weight: bold; color: #333; font-size: 13px; }

                /* Client Info */
                .client-box { background-color: #f8fafc; border-radius: 6px; padding: 15px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .client-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                .client-name { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
                .client-meta { font-size: 12px; color: #475569; }

                /* Table */
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #1e293b; color: #fff; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; vertical-align: top; }
                .bg-gray { background-color: #f8fafc; }
                .col-desc { width: 50%; }
                .col-center { text-align: center; }
                .col-right { text-align: right; }
                .item-name { font-weight: 600; color: #333; }
                .item-desc { font-size: 11px; color: #666; margin-top: 2px; }
                .font-bold { font-weight: 700; }

                /* Totals */
                .totals-container { display: flex; justify-content: flex-end; }
                .totals-table { width: 280px; border-collapse: collapse; }
                .totals-table td { padding: 6px 0; border: none; }
                .totals-table .label { text-align: left; font-weight: 600; color: #64748b; }
                .totals-table .value { text-align: right; font-weight: 600; color: #333; }
                .totals-table .total-row td { border-top: 2px solid #1e293b; padding-top: 12px; padding-bottom: 0; }
                .total-final-label { font-size: 14px; font-weight: 900; color: #1e293b; }
                .total-final-value { font-size: 18px; font-weight: 900; color: #2563eb; }

                /* Footer */
                .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="company-info">
                    ${logoSrc ? `<img src="${logoSrc}" class="logo-img"/>` : '<h1>SERVICIOS</h1>'}
                    <p>
                        <strong>CENTRO DE COPIADO S & C, SRL</strong><br>
                        RNC: 131-27958-9<br>
                        Av. Independencia esq. Héroes de Luperón
                    </p>
                </div>
                <div class="invoice-details">
                    <h1 class="invoice-title">${tituloDocumento || 'FACTURA'}</h1>
                    <div class="meta-item"><span class="meta-label">NCF:</span><span class="meta-value" style="color: #2563eb;">${ncf || 'N/A'}</span></div>
                    <div class="meta-item"><span class="meta-label">Fecha:</span><span class="meta-value">${fecha}</span></div>
                    <div class="meta-item"><span class="meta-label">Condición:</span><span class="meta-value" style="text-transform: capitalize;">${condicion || 'Contado'}</span></div>
                </div>
            </div>

            <div class="client-box">
                <div class="client-label">Facturado a:</div>
                <div class="client-name">${datosCliente.nombre || 'Cliente General'}</div>
                <div class="client-meta">RNC/Cédula: ${datosCliente.rnc || 'N/A'} • Tel: ${datosCliente.telefono || 'N/A'}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="col-desc">Descripción</th>
                        <th class="col-center">Cant.</th>
                        <th class="col-right">Precio</th>
                        <th class="col-right">Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <div class="totals-container">
                <table class="totals-table">
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="value">RD$ ${parseFloat(subtotal || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    </tr>
                    ${impuestosHTML}
                    <tr class="total-row">
                        <td class="total-final-label">TOTAL:</td>
                        <td class="total-final-value">RD$ ${parseFloat(total || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    </tr>
                </table>
            </div>

            <div class="footer">Documento generado electrónicamente por ServiGaco System.</div>
        </body>
        </html>
        `;

        // 3. Generar PDF con Puppeteer
        // Verificar si el navegador está conectado, si no, reiniciarlo
        if (!browser || !browser.isConnected()) {
            await initBrowser();
        }

        page = await browser.newPage();
        
        // CAMBIO: Usamos 'domcontentloaded' para evitar que se cuelgue esperando recursos
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' } });

        // 🔎 Paso 2 — Verifica tamaño del PDF y guarda copia local
        console.log(`📦 Tamaño del PDF generado: ${pdfBuffer.length} bytes`);
        try {
            const tempPath = path.join(__dirname, `../../temp_pdf_${Date.now()}.pdf`);
            fs.writeFileSync(tempPath, pdfBuffer);
            console.log(`📝 Copia de depuración guardada en: ${tempPath}`);
        } catch (writeErr) {
            console.warn("⚠️ No se pudo guardar copia local (esto no afecta la descarga):", writeErr.message);
        }

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("El PDF se generó vacío (0 bytes).");
        }

        // 4. Enviar PDF al cliente
        // Limpiamos el nombre de caracteres especiales (tildes, ñ) para evitar headers corruptos
        const ncfLimpio = (ncf || 'Generada').replace(/[^a-zA-Z0-9\-\_]/g, '');
        const downloadName = `Factura_${ncfLimpio}.pdf`;
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${downloadName}"`
            // No ponemos Content-Length como sugeriste para depurar.
        });
        res.end(pdfBuffer);

    } catch (error) {
        console.error("❌ [PDF] Error CRÍTICO:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Error al generar el PDF", details: error.message });
        }
    } finally {
        if (page) await page.close();
    }
};

module.exports = { generarPDF, analizarPDF };
