(function () {
  const scriptPromises = new Map();
  const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const pdfWorkerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const xlsxUrl = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  function loadScript(src, isLoaded) {
    if (isLoaded()) return Promise.resolve();
    if (scriptPromises.has(src)) return scriptPromises.get(src);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromises.delete(src);
      throw error;
    });

    scriptPromises.set(src, promise);
    return promise;
  }

  window.ensurePdfJs = () => loadScript(pdfJsUrl, () => Boolean(window.pdfjsLib)).then(() => {
    if (!window.pdfjsLib) throw new Error('PDF.js no quedó disponible después de cargarlo');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    return window.pdfjsLib;
  });

  window.ensureXlsx = () => loadScript(xlsxUrl, () => Boolean(window.XLSX)).then(() => {
    if (!window.XLSX) throw new Error('SheetJS no quedó disponible después de cargarlo');
    return window.XLSX;
  });
})();
