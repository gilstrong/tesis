'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let browser = null;
let browserLaunchingPromise = null;
let logoBase64Cache = null;

// Configuración de argumentos para entornos serverless y contenedores (Render/Linux/Windows)
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

/**
 * Inicializa la instancia global de Chromium con bloqueo contra carreras concurrentes.
 */
const initBrowser = async () => {
    if (browser && browser.isConnected()) return browser;
    if (browserLaunchingPromise) return browserLaunchingPromise;

    browserLaunchingPromise = (async () => {
        try {
            console.log('🚀 Iniciando navegador Puppeteer...');
            browser = await puppeteer.launch({
                headless: true,
                args: puppeteerArgs
            });

            browser.on('disconnected', () => {
                console.error('⚠️ [Puppeteer] Chromium desconectado. Se reanudará en la siguiente petición.');
                browser = null;
            });

            console.log('✅ Navegador Puppeteer listo.');
            return browser;
        } catch (e) {
            console.error('❌ Error iniciando navegador Puppeteer:', e.message);
            browser = null;
            throw e;
        } finally {
            browserLaunchingPromise = null;
        }
    })();

    return browserLaunchingPromise;
};

/**
 * Cierre limpio de Puppeteer para Graceful Shutdown.
 */
const closeBrowser = async () => {
    if (browser) {
        try {
            await browser.close();
            console.log('🛑 Proceso de Chromium cerrado exitosamente.');
        } catch (err) {
            console.warn('⚠️ Error al cerrar Chromium:', err.message);
        } finally {
            browser = null;
        }
    }
};

// Cargar Logo en memoria una sola vez al inicio del módulo
(() => {
    try {
        const logoPath = path.resolve(__dirname, '../public/logo.webp');
        if (fs.existsSync(logoPath)) {
            const bitmap = fs.readFileSync(logoPath);
            logoBase64Cache = `data:image/webp;base64,${bitmap.toString('base64')}`;
        }
    } catch (e) {
        console.warn('⚠️ Advertencia: No se pudo precargar el logo en base64:', e.message);
    }
})();

/**
 * Analiza un archivo PDF en memoria y devuelve estadísticas de color y blanco/negro.
 */
const analizarPDF = async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo PDF válido.' });
    }

    let page = null;
    try {
        const activeBrowser = await initBrowser();
        page = await activeBrowser.newPage();

        const analyzerHtml = `
            <!DOCTYPE html>
            <html><head>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                <script>
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                </script>
            </head><body></body></html>
        `;

        await page.setContent(analyzerHtml, { waitUntil: 'networkidle0', timeout: 30000 });

        const isLibraryReady = await page.evaluate(() => !!window.pdfjsLib);
        if (!isLibraryReady) {
            throw new Error('La librería PDF.js no pudo cargarse en Puppeteer.');
        }

        const isLargePDF = req.file.size > 50 * 1024 * 1024;
        const pdfBase64 = req.file.buffer.toString('base64');

        const results = await page.evaluate(async (base64Data, isLarge) => {
            const raw = atob(base64Data);
            const rawLength = raw.length;
            const uint8Array = new Uint8Array(rawLength);
            for (let i = 0; i < rawLength; i++) {
                uint8Array[i] = raw.charCodeAt(i);
            }

            const pdfDoc = await window.pdfjsLib.getDocument({ data: uint8Array }).promise;
            const total = pdfDoc.numPages;

            let pagesToAnalyze = [];
            if (isLarge && total > 30) {
                for (let i = 1; i <= 10; i++) pagesToAnalyze.push(i);
                const mid = Math.floor(total / 2);
                for (let i = mid - 5; i <= mid + 4; i++) pagesToAnalyze.push(i);
                for (let i = total - 9; i <= total; i++) pagesToAnalyze.push(i);
                pagesToAnalyze = [...new Set(pagesToAnalyze)].sort((a, b) => a - b);
            } else {
                for (let i = 1; i <= total; i++) pagesToAnalyze.push(i);
            }

            let paginasColor = 0;
            let paginasBN = 0;

            for (const i of pagesToAnalyze) {
                const p = await pdfDoc.getPage(i);
                const ops = await p.getOperatorList();
                const colorOps = [
                    window.pdfjsLib.OPS.setFillRGB,
                    window.pdfjsLib.OPS.setStrokeRGB,
                    window.pdfjsLib.OPS.paintJpegXObject
                ];
                const isColor = ops.fnArray.some(op => colorOps.includes(op));

                if (isColor) paginasColor++;
                else paginasBN++;

                p.cleanup();
            }

            // Si es muestreo, estimar proporcionalmente los valores numéricos
            let finalColor = paginasColor;
            let finalBN = paginasBN;
            if (isLarge && pagesToAnalyze.length > 0 && pagesToAnalyze.length < total) {
                const ratioColor = paginasColor / pagesToAnalyze.length;
                finalColor = Math.round(total * ratioColor);
                finalBN = total - finalColor;
            }

            return {
                total,
                color: finalColor,
                bw: finalBN,
                isSampled: isLarge,
                sampleNote: isLarge ? `Muestra estimada en base a ${pagesToAnalyze.length} páginas` : null
            };
        }, pdfBase64, isLargePDF);

        res.json(results);
    } catch (error) {
        console.error('❌ [PDF Controller] Error en análisis:', error);
        res.status(500).json({ error: 'Error analizando PDF', message: error.message });
    } finally {
        if (page) {
            try {
                if (!page.isClosed()) await page.close();
            } catch (closeErr) {
                console.warn('Advertencia cerrando página de Puppeteer:', closeErr.message);
            }
        }
    }
};

/**
 * Genera un PDF a partir de una plantilla HTML directa o de datos JSON de cotización/factura.
 */
const generarPDF = async (req, res) => {
    let page = null;
    try {
        const data = req.body || {};
        const activeBrowser = await initBrowser();

        // MODO 1: HTML DIRECTO
        if (data.html) {
            page = await activeBrowser.newPage();
            await page.setContent(data.html, { waitUntil: 'networkidle0', timeout: 60000 });

            const pdfBuffer = await page.pdf({
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
            });

            const filename = data.filename || 'documento.pdf';
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`
            });
            return res.end(pdfBuffer);
        }

        // MODO 2: DATOS JSON
        const logoSrc = logoBase64Cache;
        const { ncf, fecha, cliente, items, subtotal, impuestos, total, tituloDocumento, condicion } = data;
        const listaItems = Array.isArray(items) ? items : [];
        const datosCliente = cliente || {};

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
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
                .company-info h1 { margin: 0; font-size: 22px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
                .company-info p { margin: 5px 0 0; font-size: 12px; color: #666; }
                .logo-img { height: 70px; width: auto; object-fit: contain; }
                .invoice-details { text-align: right; }
                .invoice-title { font-size: 32px; font-weight: 900; color: #1e293b; margin: 0 0 5px 0; letter-spacing: -1px; }
                .meta-item { margin-bottom: 3px; }
                .meta-label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; margin-right: 5px; }
                .meta-value { font-weight: bold; color: #333; font-size: 13px; }
                .client-box { background-color: #f8fafc; border-radius: 6px; padding: 15px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .client-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                .client-name { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
                .client-meta { font-size: 12px; color: #475569; }
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
                .totals-container { display: flex; justify-content: flex-end; }
                .totals-table { width: 280px; border-collapse: collapse; }
                .totals-table td { padding: 6px 0; border: none; }
                .totals-table .label { text-align: left; font-weight: 600; color: #64748b; }
                .totals-table .value { text-align: right; font-weight: 600; color: #333; }
                .totals-table .total-row td { border-top: 2px solid #1e293b; padding-top: 12px; padding-bottom: 0; }
                .total-final-label { font-size: 14px; font-weight: 900; color: #1e293b; }
                .total-final-value { font-size: 18px; font-weight: 900; color: #2563eb; }
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

        page = await activeBrowser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
        });

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('El PDF se generó vacío (0 bytes).');
        }

        const ncfLimpio = (ncf || 'Generada').replace(/[^a-zA-Z0-9\-_]/g, '');
        const downloadName = `Factura_${ncfLimpio}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${downloadName}"`
        });
        res.end(pdfBuffer);
    } catch (error) {
        console.error('❌ [PDF Controller] Error generando PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error al generar el PDF', details: error.message });
        }
    } finally {
        if (page) {
            try {
                if (!page.isClosed()) await page.close();
            } catch (closeErr) {
                console.warn('Advertencia cerrando página:', closeErr.message);
            }
        }
    }
};

module.exports = {
    generarPDF,
    analizarPDF,
    initBrowser,
    closeBrowser
};
