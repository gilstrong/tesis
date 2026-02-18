// ============================================
// 📋 CONFIGURACIÓN Y CONSTANTES
// ============================================



// 🔗 URL DE TU API DE GOOGLE SHEETS (Pégala aquí abajo)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRUMlkInT_O_C6G_q15jb8mVqVcX9SOLwu9Tl9_ucgwsu1C-ZfoIJIqrCcROo5WwSJbQ/exec';

// 🔥 CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBgVrMPSwZg3O5zbuIozstpG0bM8XFEeZE",
  authDomain: "servigaco.firebaseapp.com",
  databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
  projectId: "servigaco",
  storageBucket: "servigaco.firebasestorage.app",
  messagingSenderId: "516579834487",
  appId: "1:516579834487:web:e7fb1c46d93bb62a98a472"
};

const PRECIOS = {
  carta: {
    bond: { bn: 6, color: 12 },
    hilo: { bn: 8, color: 15 },
    satinado: { precio: 25 }
  },
  tabloide: {
    satinado: { precio: 45 }
  }
};

const TAPA_DURA = {
  beige: 600,
  morado: 500,
  azul_marino: 500,
  azul_cielo: 500,
  rojo: 500,
  verde_botella: 500,
  amarillo_medicina: 500,
  blanco: 600,
};

const VINIL = {
  carta: 1200,
  tabloide: 1500
};

// Constantes de servicios adicionales
const PRECIOS_SERVICIOS = {
  LOMO: 50,
  CD: 200,
  REDONDEO_MULTIPLO: 5
};

const BLOQUE_MENSAJE_PAGINA_SIGUIENTE = `
  <div class="mensaje-pagina-siguiente">
    <span class="flecha">⬇</span>
    <span class="texto">
      Debajo encontrarás las cuentas bancarias y el ejemplar del empastado
    </span>
  </div>
`;


const TIEMPO_ENTREGA = {
  TAPA_DURA: '6 horas',
  VINIL: '24 horas'
};

// ============================================
// 🖼️ IMÁGENES DE EJEMPLARES POR COLOR
// ============================================

const IMAGEN_EJEMPLAR_TAPA = {
  beige: 'beige.png',
  morado: 'morado.png',
  azul_marino: 'mclcielo.png',
  rojo: 'img/ejemplar-rojo.jpg',
  verde_botella: 'verde.png',
  amarillo_medicina: 'amarillo.png',
  blanco: 'blanco.png',
  azul_cielo: 'azul.png'
};

const BLOQUE_CUENTAS = `
  <div class="cuentas-pago">
    <img src="bhd.jpg" alt="Cuenta BHD" class="img-cuenta">
    <img src="popular.jpg" alt="Cuenta Popular" class="img-cuenta">
    <img src="banreservas.jpg" alt="Cuenta Banreservas" class="img-cuenta">
  </div>


    <!-- AQUÍ va el tiempo de entrega -->
    {{TIEMPO_ENTREGA}}
`;

// ============================================
// 🔧 UTILIDADES
// ============================================

/**
 * Convierte nombre de color con guiones bajos a formato legible
 * @param {string} color - Nombre del color con guiones bajos
 * @returns {string} Nombre formateado
 */
function nombreColor(color) {
  return color.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Redondea un número al múltiplo de 5 más cercano
 * @param {number} num - Número a redondear
 * @returns {number} Número redondeado
 */
function redondearA5(num) {
  return Math.round(num / PRECIOS_SERVICIOS.REDONDEO_MULTIPLO) * PRECIOS_SERVICIOS.REDONDEO_MULTIPLO;
}

/**
 * Formatea un número como moneda dominicana
 * @param {number} valor - Valor a formatear
 * @returns {string} Valor formateado
 */
function formatearMoneda(valor) {
  return `RD$${valor.toLocaleString('es-DO')}`;
}

// ============================================
// 🆔 ID Y FECHA DE COTIZACIÓN
// ============================================

function generarIdCotizacion() {
  const fecha = new Date();
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  const h = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100);

  return `CTZ-${y}${m}${d}-${h}${min}-${rand}`;
}

function fechaFormateada() {
  return new Date().toLocaleString('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function nombreArchivoPDF(id, colorTapa) {
  const color = colorTapa ? colorTapa.replace(/_/g, '-') : 'vinil';
  return `${id}-${color}.pdf`;
}


/**
 * Obtiene valor numérico de un input con valor por defecto
 * @param {string} id - ID del elemento
 * @param {number} valorDefecto - Valor por defecto
 * @returns {number} Valor parseado
 */
function obtenerValorNumerico(id, valorDefecto = 0) {
  return parseInt(document.getElementById(id)?.value) || valorDefecto;
}

// ============================================
// 📱 ELEMENTOS DEL DOM
// ============================================

const elementos = {
  // Selectores principales
  tamano: document.getElementById('tamano'),
  papel: document.getElementById('papel'),
  tipoEmpastado: document.getElementById('tipoEmpastado'),
  
  // Alertas y secciones
  alertaTabloide: document.getElementById('alertaTabloide'),
  bnColorSection: document.getElementById('bnColorSection'),
  soloPaginas: document.getElementById('soloPaginas'),
  colorTapaSection: document.getElementById('colorTapaSection'),
  
  // CD
  llevaCd: document.getElementById('llevaCd'),
  cdSection: document.getElementById('cdSection'),
  
  // Resultado
  resultado: document.getElementById('cotizacionGenerada'),
  
  // Botones
  btnCalcular: document.getElementById('btnCalcular'),
  btnDescargarPdf: document.getElementById('btnDescargarPdf'),
  btnGenerar: document.getElementById('btnGenerar'),
  btnReiniciar: document.getElementById('btnReiniciar'),
  btnMostrarTabla: document.getElementById('btnMostrarTabla'),
  btnGuardarTesis: document.getElementById('btnGuardarTesis'),
  btnVerGuardadas: document.getElementById('btnVerGuardadas'),
  
  // Otros
  tablaPrecios: document.getElementById('tablaPrecios')
};

let ultimaCotizacion = '';
let datosGlobales = {};
let datosUltimaCotizacion = null; // Variable para almacenar los datos completos de la última cotización
let datosParaGuardar = null; // Variable temporal para guardar en Sheets
let todasLasCotizaciones = []; // Para el modal de Firebase
let idCotizacionAEliminar = null; // Variable temporal para eliminación

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();


// ============================================
// 🎨 FUNCIONES DE VISTA
// ============================================

/**
 * Actualiza la visibilidad de secciones según selecciones
 */
function actualizarVista() {
  const tamano = elementos.tamano.value;

  // Primero forzamos el modo según tamaño
  if (tamano === 'tabloide') {
    configurarModoTabloide();
  } else {
    configurarModoCarta();
  }

  // 🔥 AHORA sí leemos los valores reales
  const esSatinado = elementos.papel.value === 'satinado';
  const esTapaDura = elementos.tipoEmpastado.value === 'tapa_dura';

  // Mostrar/ocultar secciones según papel
  elementos.bnColorSection.style.display = esSatinado ? 'none' : 'block';
  elementos.soloPaginas.style.display = esSatinado ? 'block' : 'none';

  // Color de tapa SOLO carta + tapa dura
  elementos.colorTapaSection.style.display =
    (esTapaDura && tamano === 'carta') ? 'block' : 'none';
}


/**
 * Configura vista para modo tabloide
 */
function configurarModoTabloide() {
  elementos.alertaTabloide.style.display = 'block';
  elementos.papel.value = 'satinado';
  elementos.papel.disabled = true;
  elementos.tipoEmpastado.value = 'vinil';
  elementos.tipoEmpastado.disabled = true;
}

/**
 * Configura vista para modo carta
 */
function configurarModoCarta() {
  elementos.alertaTabloide.style.display = 'none';
  elementos.papel.disabled = false;
  elementos.tipoEmpastado.disabled = false;
}

/**
 * Alterna visibilidad de sección CD
 */
function toggleSeccionCD() {
  const mostrar = elementos.llevaCd.value === 'si';
  elementos.cdSection.style.display = mostrar ? 'block' : 'none';
}

/**
 * Alterna visibilidad de tabla de precios
 */
function toggleTablaPrecios() {
  elementos.tablaPrecios?.classList.toggle('mostrar');
}

// ============================================
// 🧮 LÓGICA DE CÁLCULO
// ============================================

/**
 * Calcula el costo de impresión según el tipo de papel
 * @returns {Object} {impresion, detalleImpresion}
 */
function calcularImpresion() {
  const esSatinado = elementos.papel.value === 'satinado';
  
  if (esSatinado) {
    return calcularImpresionSatinado();
  } else {
    return calcularImpresionBondHilo();
  }
}

function eliminarCotizacionGuardada(id) {
  const cotizacion = todasLasCotizaciones.find(c => c.id === id);
  if (cotizacion) {
    idCotizacionAEliminar = id;
    const nombreSpan = document.getElementById('nombreCotizacionEliminar');
    if (nombreSpan) nombreSpan.textContent = `"${cotizacion.nombre}"`;
    document.getElementById('modalConfirmarEliminar').classList.remove('hidden');
  }
}

async function ejecutarEliminacionCotizacion() {
  if (!idCotizacionAEliminar) return;
  const id = idCotizacionAEliminar;

  // Cerrar modal
  document.getElementById('modalConfirmarEliminar').classList.add('hidden');
  idCotizacionAEliminar = null;

  try {
    await db.ref("cotizaciones").child(id).remove();
    todasLasCotizaciones = todasLasCotizaciones.filter(c => c.id !== id);
    renderizarCotizacionesGuardadas();
    mostrarNotificacion('Cotización eliminada', 'success');
  } catch (e) {
    console.error(e);
    mostrarNotificacion('Error al eliminar', 'error');
  }
}
/**
 * Calcula impresión para papel satinado
 * @returns {Object}
 */
function calcularImpresionSatinado() {
  const paginas = obtenerValorNumerico('paginas');
  
  if (!paginas) {
    throw new Error('Debe ingresar la cantidad de páginas');
  }

  const precio = PRECIOS[elementos.tamano.value].satinado.precio;
  
  return {
    impresion: paginas * precio,
    detalleImpresion: `${paginas} páginas x RD$${precio}`
  };
}

/**
 * Calcula impresión para papel bond/hilo
 * @returns {Object}
 */
function calcularImpresionBondHilo() {
  const bn = obtenerValorNumerico('bn');
  const color = obtenerValorNumerico('color');
  
  if (bn + color === 0) {
    throw new Error('Debe ingresar páginas en blanco y negro o color');
  }

  const precios = PRECIOS[elementos.tamano.value][elementos.papel.value];
  
  return {
    impresion: bn * precios.bn + color * precios.color,
    detalleImpresion: `${bn} B/N + ${color} Color`
  };
}

/**
 * Calcula el costo del empastado
 * @param {number} tomos - Cantidad de tomos
 * @returns {Object} {empastado, tipoEmp, colorTapa}
 */
function calcularEmpastado(tomos) {
  const tipoEmp = elementos.tipoEmpastado.value;
  const colorTapa = tipoEmp === 'tapa_dura' 
    ? document.getElementById('colorTapa').value 
    : '';

  const costoUnitario = tipoEmp === 'vinil'
    ? VINIL[elementos.tamano.value]
    : TAPA_DURA[colorTapa];

  return {
    empastado: costoUnitario * tomos,
    tipoEmp,
    colorTapa,
    costoUnitario
  };
}

/**
 * Genera bloque visual del ejemplar según color de tapa
 * @param {string} tipoEmp
 * @param {string} colorTapa
 * @returns {string}
 */
function generarBloqueEjemplar(tipoEmp, colorTapa) {
  if (tipoEmp !== 'tapa_dura') return '';

  const src = IMAGEN_EJEMPLAR_TAPA[colorTapa];
  if (!src) return '';

  return `
    <div class="bloque-ejemplar">
      <div class="bloque-ejemplar-header">
        📘 Ejemplar – Tapa ${nombreColor(colorTapa)}
      </div>
      <div class="bloque-ejemplar-img">
        <img src="${src}" alt="Ejemplar color ${colorTapa}">
      </div>
    </div>
  `;
}


/**
 * Calcula servicios adicionales
 * @param {number} tomos - Cantidad de tomos
 * @returns {Object} {lomoVal, cdVal, lomo, cd, cantidadCd}
 */
function calcularServiciosAdicionales(tomos) {
  const lomo = document.getElementById('lomo').value === 'si';
  const lomoVal = lomo ? PRECIOS_SERVICIOS.LOMO * tomos : 0;

  const cd = elementos.llevaCd.value === 'si';
  const cantidadCd = cd ? obtenerValorNumerico('cantidadCd') : 0;
  const cdVal = cantidadCd * PRECIOS_SERVICIOS.CD;

  return { lomoVal, cdVal, lomo, cd, cantidadCd };
}

/**
 * Función principal de cálculo de cotización
 */
function calcular() {
  try {

    const idCotizacion = generarIdCotizacion();
    const fecha = fechaFormateada();

    const tomos = Math.max(1, obtenerValorNumerico('tomos', 1));
    
    // Cálculo de impresión
    const { impresion, detalleImpresion } = calcularImpresion();
    
    // Cálculo de empastado
    const { empastado, tipoEmp, colorTapa, costoUnitario } = calcularEmpastado(tomos);
    
    // Servicios adicionales
    const { lomoVal, cdVal, lomo, cd, cantidadCd } = calcularServiciosAdicionales(tomos);
    
    // Total
    const total = impresion * tomos + empastado + lomoVal + cdVal;
    const totalRedondeado = redondearA5(total);
    
    // Guardar datos completos para la generación de PDF
    datosUltimaCotizacion = {
      tomos,
      impresion,
      detalleImpresion,
      empastado,
      tipoEmp,
      colorTapa,
      costoUnitario,
      lomoVal,
      lomo,
      cdVal,
      cd,
      cantidadCd,
      totalRedondeado,
      idCotizacion,
      fecha
    };
    // Generar HTML de cotización
datosGlobales = {
  idCotizacion,
  colorTapa
};

// Preparar datos para Google Sheets
datosParaGuardar = {
  descripcion: 'Tesis', // 🏷️ Cambiado de 'tipo' a 'descripcion'
  total: totalRedondeado.toFixed(2),
  detalle: `📚 ${tomos} tomos - RD$${totalRedondeado.toFixed(2)}\n📄 ${nombreColor(elementos.tamano.value)} / ${nombreColor(elementos.papel.value)}\n📕 ${nombreColor(elementos.tipoEmpastado.value)}`
};
ultimaCotizacion = generarHTMLCotizacion(datosUltimaCotizacion);


    
    elementos.resultado.innerHTML = ultimaCotizacion;
    elementos.resultado.style.display = 'block';
    mostrarNotificacion('Cotización calculada exitosamente', 'success');
    
  } catch (error) {
    mostrarNotificacion(error.message, 'error');
  }
}

// ============================================
// 🎨 GENERACIÓN DE HTML
// ============================================

/**
 * Genera el HTML completo de la cotización
 * @param {Object} datos - Datos de la cotización
 * @returns {string} HTML generado
 */
function generarHTMLCotizacion(datos) {
return `
  <div class="page-break"></div>

  <div class="cotizacion">
    ${generarEncabezado(datos.idCotizacion, datos.fecha)}
    ${generarTablaDetalle(datos)}
    
      ${generarTablaTotal(datos.totalRedondeado)}
      ${BLOQUE_MENSAJE_PAGINA_SIGUIENTE}
  
    
    ${generarBloqueEjemplar(datos.tipoEmp, datos.colorTapa)}
    ${BLOQUE_CUENTAS.replace(
      '{{TIEMPO_ENTREGA}}',
      generarTiempoEntrega(datos.tipoEmp)
    )}
  </div>
`;

}

function formatearMonto(valor) {
  return Number(valor).toLocaleString('en-US');
}



/**
 * Genera el encabezado de la cotización
 * @returns {string}
 */
function generarEncabezado(idCotizacion, fecha) {
  return `
    <div class="cotizacion-header">
      <img src="s="logo" alt="Logo ServiGaco">
      <div class="empresa-info">
        <h1>Cotización de Tesis</h1>
        <p>
          <strong>ID:</strong> ${idCotizacion}<br>
          <strong>Fecha:</strong> ${fecha}<br>
          ServiGaco<br>
          Tel: 809-682-1075
        </p>
      </div>
    </div>
  `;
}


/**
 * Genera la tabla de detalle de servicios
 * @param {Object} datos
 * @returns {string}
 */
function generarTablaDetalle(datos) {
  const filaLomo = datos.lomo ? generarFilaLomo(datos.tomos, datos.lomoVal) : '';
  const filaCD = (datos.cd && datos.cantidadCd) ? generarFilaCD(datos.cantidadCd, datos.cdVal) : '';

  return `
    <div style="overflow-x: auto; width: 100%; margin-bottom: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-light);">
      <table class="tabla-cotizacion" style="min-width: 650px; margin-top: 0;">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Detalle</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${generarFilaImpresion(datos)}
          ${generarFilaEmpastado(datos)}
          ${filaLomo}
          ${filaCD}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Genera fila de impresión
 * @param {Object} datos
 * @returns {string}
 */
function generarFilaImpresion(datos) {
  return `
    <tr>
      <td><strong>Impresión</strong></td>
      <td>${datos.detalleImpresion}</td>
      <td class="center">${datos.tomos}</td>
      <td class="right">RD$${formatearMonto(datos.impresion)}</td>
      <td class="right">RD$${formatearMonto(datos.impresion * datos.tomos)}</td>

    </tr>
  `;
}

/**
 * Genera fila de empastado
 * @param {Object} datos
 * @returns {string}
 */
function generarFilaEmpastado(datos) {
  const detalle = datos.tipoEmp === 'tapa_dura'
    ? `Tapa dura (${nombreColor(datos.colorTapa)})`
    : 'Vinil';

  return `
    <tr>
      <td><strong>Empastado</strong></td>
      <td>${detalle}</td>
      <td class="center">${datos.tomos}</td>
      <td class="right">RD$${formatearMonto(datos.costoUnitario)}</td>
      <td class="right">RD$${formatearMonto(datos.empastado)}</td>

    </tr>
  `;
}

/**
 * Genera fila de lomo
 * @param {number} tomos
 * @param {number} lomoVal
 * @returns {string}
 */
function generarFilaLomo(tomos, lomoVal) {
  return `
    <tr>
      <td>Lomo</td>
      <td>Incluido</td>
      <td class="center">${tomos}</td>
      <td>RD$${formatearMonto(PRECIOS_SERVICIOS.LOMO)}</td>
      <td>RD$${formatearMonto(lomoVal)}</td>

    </tr>
  `;
}


/**
 * Genera fila de CD
 * @param {number} cantidadCd
 * @param {number} cdVal
 * @returns {string}
 */
function generarFilaCD(cantidadCd, cdVal) {
  return `
    <tr>
      <td>CD</td>
      <td>${cantidadCd} unidad(es)</td>
      <td class="center">${cantidadCd}</td>
      <td>RD$${formatearMonto(PRECIOS_SERVICIOS.CD)}</td>
      <td>RD$${formatearMonto(cdVal)}</td>

    </tr>
  `;
}

/**
 * Genera tabla de total
 * @param {number} total
 * @returns {string}
 */
function generarTablaTotal(total) {
  return `
    <table class="tabla-total">
      <tr>
        <td><strong>Total General</strong></td>
        <td class="right"><strong>RD$${formatearMonto(total)}</strong></td>
      </tr>
    </table>
  `;
}

/**
 * Genera mensaje de tiempo de entrega
 * @param {string} tipoEmp
 * @returns {string}
 */
function generarTiempoEntrega(tipoEmp) {
  const tiempo = tipoEmp === 'tapa_dura' 
    ? TIEMPO_ENTREGA.TAPA_DURA 
    : TIEMPO_ENTREGA.VINIL;
    
  return `
    <div class="tiempo-entrega">
      ⏰ Tiempo de entrega: en tapa dura ${tiempo}, si es apartir de las 12:00 PM se entrega al otro dia / ${TIEMPO_ENTREGA.VINIL} vinil.
    </div>
  `;
}

// ============================================
// 🖨️ FUNCIONES DE IMPRESIÓN Y COMPARTIR
// ============================================

/**
 * Genera el HTML completo y autocontenido para la cotización, ideal para PDF o impresión.
 * @param {Object} datos - Los datos completos de la cotización.
 * @returns {string} - El string HTML completo.
 */
function generarHTMLParaImprimir(datos) {
  // Generar filas de la tabla
  const filaImpresion = generarFilaImpresion(datos);
  const filaEmpastado = generarFilaEmpastado(datos);
  const filaLomo = datos.lomo ? generarFilaLomo(datos.tomos, datos.lomoVal) : '';
  const filaCD = (datos.cd && datos.cantidadCd) ? generarFilaCD(datos.cantidadCd, datos.cdVal) : '';
  const tableBody = `${filaImpresion}${filaEmpastado}${filaLomo}${filaCD}`;

  // Generar pie de tabla con total
  const resumenHTML = `
    <tr style="background: linear-gradient(to right, #2563eb, #1e40af);">
      <td colspan="4" style="text-align: right; font-weight: bold; color: white; padding: 16px; font-size: 14px;">TOTAL:</td>
      <td style="text-align: right; font-weight: 900; color: white; padding: 16px; font-size: 18px; background: linear-gradient(to right, #ea580c, #c2410c);">RD$${formatearMonto(datos.totalRedondeado)}</td>
    </tr>
  `;

  // Construir el HTML completo para el PDF
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <base href="${window.location.origin}/">
      <title>Cotización Tesis - ${datos.idCotizacion}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: white; }
        .container { max-width: 900px; margin: 0 auto; background: white; overflow: hidden; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 50%, #1e3a8a 100%); color: white; padding: 40px 30px; position: relative; overflow: hidden; }
        .header-content { position: relative; z-index: 1; text-align: center; }
        .logo { width: 140px; height: auto; margin: 0 auto 15px; display: block; }
        .header h1 { font-size: 28px; font-weight: 900; margin-bottom: 5px; letter-spacing: -0.5px; }
        .header-divider { width: 50px; height: 4px; background: linear-gradient(to right, #f97316, #ea580c); margin: 10px auto 15px; border-radius: 10px; }
        .header p { font-size: 12px; color: #bfdbfe; font-weight: 600; letter-spacing: 1px; margin-bottom: 15px; }
        .header-badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 12px 20px; font-size: 12px; font-weight: 600; }
        .content { padding: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
        thead tr { background: linear-gradient(to right, #2563eb, #1e40af); color: white; }
        thead th { padding: 14px 16px; text-align: left; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; }
        tbody tr { border-bottom: 1px solid #e0e7ff; }
        tbody tr:nth-child(odd) { background: #f0f9ff; }
        tbody td { padding: 14px 16px; font-size: 13px; }
        tbody td:first-child { font-weight: 700; color: #1e3a8a; }
        .center { text-align: center; }
        .right { text-align: right; }
        .footer { background: linear-gradient(to right, #1f2937, #111827); border-top: 4px solid #ea580c; padding: 25px 30px; text-align: center; color: white; }
        .footer-brand { color: #f97316; font-weight: 900; font-size: 16px; letter-spacing: 1px; margin-bottom: 5px; }
        .footer-subtitle { color: #cbd5e1; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
        .footer-text { color: #94a3b8; font-size: 11px; line-height: 1.6; border-top: 1px solid #374151; padding-top: 12px; margin-top: 12px; }
        /* Estilos para los bloques adicionales */
        .bloque-ejemplar, .cuentas-pago, .tiempo-entrega { page-break-inside: avoid; margin-top: 2rem; }
        .bloque-ejemplar { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .bloque-ejemplar-header { background: #f3f4f6; padding: 10px; font-weight: bold; }
        .bloque-ejemplar-img { padding: 20px; text-align: center; }
        .bloque-ejemplar-img img { max-width: 250px; height: auto; }
        .cuentas-pago { text-align: center; }
        .img-cuenta { max-width: 100%; height: auto; margin-bottom: 1rem; }
        .tiempo-entrega { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; text-align: center; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <img src="Servigaco Logo" class="logo" />
            <h1>Cotización de Tesis</h1>
            <div class="header-divider"></div>
            <p>ID: ${datos.idCotizacion}</p>
            <div class="header-badge">
              📅 ${datos.fecha} | ✓ Presupuesto Válido
            </div>
          </div>
        </div>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Detalle</th>
                <th class="center">Cantidad</th>
                <th class="right">Precio Unit.</th>
                <th class="right">Subtotal</th>
              </tr>
            </thead>
            <tbody>${tableBody}</tbody>
            <tfoot>${resumenHTML}</tfoot>
          </table>
          ${generarBloqueEjemplar(datos.tipoEmp, datos.colorTapa)}
          ${BLOQUE_CUENTAS.replace('{{TIEMPO_ENTREGA}}', generarTiempoEntrega(datos.tipoEmp))}
        </div>
        <div class="footer">
          <div class="footer-brand">ServiGaco®</div>
          <div class="footer-subtitle">CALIDAD Y RAPIDEZ</div>
          <div class="footer-text">Cotización generada automáticamente. Válida por 30 días.</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Obtiene el PDF como un Blob desde el backend.
 * @param {Object} datos - Los datos completos de la cotización.
 * @returns {Promise<Blob>}
 */
async function getPDFBlob(datos) {
  const filename = nombreArchivoPDF(datos.idCotizacion, datos.colorTapa);
  const html = generarHTMLParaImprimir(datos); // Reutilizamos la función de generación de HTML

  const response = await fetch('/generar-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: html, filename: filename })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'El servidor no pudo generar el PDF.');
    } else {
      throw new Error(`Error ${response.status}: El endpoint /generar-pdf no existe.\n\n⚠️ CAUSA PROBABLE: No estás ejecutando 'node server.js' o estás usando otro servidor (como Live Server) en el puerto 3000.`);
    }
  }

  return await response.blob();
}

/**
 * Abre una nueva ventana con la cotización formateada y activa el diálogo de impresión del navegador.
 * Este método es rápido, optimizado y no depende del backend.
 */
function imprimir() {
  if (!ultimaCotizacion || !datosUltimaCotizacion) {
    return mostrarNotificacion('Calcule primero la cotización', 'warning');
  }

  try {
    // 1. Generamos el HTML optimizado para impresión, que es autocontenido.
    const htmlCompleto = generarHTMLParaImprimir(datosUltimaCotizacion);

    // 2. Abrimos una nueva ventana para la impresión.
    const ventanaImpresion = window.open('', 'Imprimir Cotización', 'height=800,width=1200');
    
    // 3. Escribimos el contenido en la nueva ventana.
    ventanaImpresion.document.write(htmlCompleto);
    ventanaImpresion.document.close(); // Esencial para que 'onload' se dispare correctamente.
    
    // 4. Esperamos a que todo (incluyendo CSS e imágenes) se cargue antes de imprimir.
    ventanaImpresion.onload = function() {
      ventanaImpresion.focus(); // Asegura que la ventana de impresión esté al frente.
      ventanaImpresion.print(); // Llama al diálogo de impresión del navegador.
      
      // 5. Cerramos la ventana auxiliar después de que el usuario interactúe con el diálogo.
      // Usamos un pequeño timeout para dar tiempo a que el comando de impresión se envíe.
      setTimeout(() => {
        ventanaImpresion.close();
      }, 250);
    };

  } catch (error) {
    console.error('Error al preparar la impresión:', error);
    mostrarNotificacion(error.message || 'Error al generar la vista de impresión', 'error');
  }
}


/**
 * Genera y descarga el PDF usando el backend con Puppeteer
 */
async function generarPDFDesdeBackend() {
  if (!ultimaCotizacion || !datosUltimaCotizacion) {
    mostrarNotificacion('Primero genera la cotización', 'warning');
    return;
  }

  const btnDescargar = document.getElementById('btnDescargarPdf');
  const originalTextDescargar = btnDescargar.innerHTML;

  // Show loading state
  if (btnDescargar) {
    btnDescargar.disabled = true;
    btnDescargar.innerHTML = `<span class="text-xl animate-spin">⚙️</span> Generando...`;
  }

  try {
    const datos = datosUltimaCotizacion;
    const filename = nombreArchivoPDF(datos.idCotizacion, datos.colorTapa);

    const pdfBlob = await getPDFBlob(datos);

    // Download
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (error) {
    console.error('Error al generar PDF desde backend:', error);
    mostrarNotificacion(error.message || 'Error al generar el PDF', 'error');
  } finally {
    // Restore button
    if (btnDescargar) {
      btnDescargar.disabled = false;
      btnDescargar.innerHTML = originalTextDescargar;
    }
  }
}

// ============================================
// 🔄 FUNCIÓN DE REINICIO
// ============================================

/**
 * Reinicia el formulario a valores por defecto
 */
function reiniciar() {
  // Limpiar campos numéricos
  const camposLimpiar = ['bn', 'color', 'paginas', 'cantidadCd'];
  camposLimpiar.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.value = '';
  });

  // Restablecer tomos a 1
  const tomos = document.getElementById('tomos');
  if (tomos) tomos.value = 1;

  // Restablecer selectores
  elementos.tamano.value = 'carta';
  elementos.papel.value = 'bond';
  elementos.tipoEmpastado.value = 'tapa_dura';
  
  const colorTapa = document.getElementById('colorTapa');
  if (colorTapa) colorTapa.value = 'beige';
  
  const lomo = document.getElementById('lomo');
  if (lomo) lomo.value = 'no';
  
  elementos.llevaCd.value = 'no';

  // Ocultar secciones
  elementos.cdSection.style.display = 'none';
  elementos.alertaTabloide.style.display = 'none';

  // Limpiar resultado
  elementos.resultado.innerHTML = '';
  elementos.resultado.style.display = 'none';
  ultimaCotizacion = '';

  // Actualizar vista
  actualizarVista();
  
  guardarTesisLocalStorage();
  mostrarNotificacion('Formulario reiniciado', 'success');
}

// ============================================
// 🎬 INICIALIZACIÓN Y EVENTOS
// ============================================

/**
 * Inicializa la aplicación
 */
function inicializar() {
  if (window.location.protocol === 'file:') {
    alert("⚠️ ATENCIÓN: Estás abriendo el archivo directamente (file://).\n\nPara que la generación de PDF funcione, debes usar el servidor local.\n\nEjecuta 'node server.js' y abre http://localhost:3000");
  }

  // Establecer valor por defecto
  elementos.tipoEmpastado.value = 'tapa_dura';
  
  // Cargar datos guardados (si existen)
  cargarTesisLocalStorage();
  
  // Configurar eventos principales
  [elementos.tamano, elementos.papel, elementos.tipoEmpastado].forEach(el => {
    el.addEventListener('change', actualizarVista);
  });

  // Evento para CD
  elementos.llevaCd.addEventListener('change', toggleSeccionCD);

  // Eventos de botones
  elementos.btnCalcular.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); calcular(); });
  elementos.btnGenerar.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); imprimir(); });
  if (elementos.btnDescargarPdf) {
    elementos.btnDescargarPdf.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      generarPDFDesdeBackend();
    });
  }
  elementos.btnReiniciar.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); reiniciar(); });

  // Eventos Firebase
  if (elementos.btnGuardarTesis) {
    elementos.btnGuardarTesis.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); guardarTesisEnFirebase(); });
  }
  if (elementos.btnVerGuardadas) {
    elementos.btnVerGuardadas.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); abrirModalCotizaciones(); });
  }

  // Evento tabla de precios (opcional)
  if (elementos.btnMostrarTabla) {
    elementos.btnMostrarTabla.addEventListener('click', toggleTablaPrecios);
  }

  // Listeners para persistencia en todos los inputs
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(el => {
    el.addEventListener('change', guardarTesisLocalStorage);
    el.addEventListener('input', guardarTesisLocalStorage);
  });

  // Eventos Modal
  const btnCerrarModal = document.getElementById('btnCerrarModal');
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalCotizaciones);
  
  // Cerrar modal al hacer click fuera
  const modal = document.getElementById('modalCotizacionesGuardadas');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModalCotizaciones();
    });
  }

  // Eventos Modal Eliminar
  const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
  if (btnConfirmarEliminar) btnConfirmarEliminar.addEventListener('click', ejecutarEliminacionCotizacion);

  const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
  if (btnCancelarEliminar) btnCancelarEliminar.addEventListener('click', () => {
    document.getElementById('modalConfirmarEliminar').classList.add('hidden');
    idCotizacionAEliminar = null;
  });

  // Eventos Modal Guardar (Nuevo)
  const btnConfirmarGuardar = document.getElementById('btnConfirmarGuardar');
  if (btnConfirmarGuardar) btnConfirmarGuardar.addEventListener('click', confirmarGuardarTesis);

  const btnCancelarGuardar = document.getElementById('btnCancelarGuardar');
  if (btnCancelarGuardar) btnCancelarGuardar.addEventListener('click', () => {
    document.getElementById('modalGuardarTesis').classList.add('hidden');
  });

  // Actualizar vista inicial
  actualizarVista();
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}

// ============================================
// 💾 PERSISTENCIA (LOCALSTORAGE)
// ============================================

function guardarTesisLocalStorage() {
  const datos = {
    tamano: document.getElementById('tamano')?.value,
    papel: document.getElementById('papel')?.value,
    bn: document.getElementById('bn')?.value,
    color: document.getElementById('color')?.value,
    paginas: document.getElementById('paginas')?.value,
    tomos: document.getElementById('tomos')?.value,
    tipoEmpastado: document.getElementById('tipoEmpastado')?.value,
    colorTapa: document.getElementById('colorTapa')?.value,
    lomo: document.getElementById('lomo')?.value,
    llevaCd: document.getElementById('llevaCd')?.value,
    cantidadCd: document.getElementById('cantidadCd')?.value
  };
  localStorage.setItem('cotizacion_tesis_datos', JSON.stringify(datos));
}

function cargarTesisLocalStorage() {
  const guardado = localStorage.getItem('cotizacion_tesis_datos');
  if (guardado) {
    try {
      const datos = JSON.parse(guardado);
      if (datos.tamano) document.getElementById('tamano').value = datos.tamano;
      if (datos.papel) document.getElementById('papel').value = datos.papel;
      if (datos.bn) document.getElementById('bn').value = datos.bn;
      if (datos.color) document.getElementById('color').value = datos.color;
      if (datos.paginas) document.getElementById('paginas').value = datos.paginas;
      if (datos.tomos) document.getElementById('tomos').value = datos.tomos;
      if (datos.tipoEmpastado) document.getElementById('tipoEmpastado').value = datos.tipoEmpastado;
      if (datos.colorTapa) document.getElementById('colorTapa').value = datos.colorTapa;
      if (datos.lomo) document.getElementById('lomo').value = datos.lomo;
      if (datos.llevaCd) document.getElementById('llevaCd').value = datos.llevaCd;
      if (datos.cantidadCd) document.getElementById('cantidadCd').value = datos.cantidadCd;

      toggleSeccionCD();
    } catch (e) {
      console.error('Error cargando datos de tesis', e);
    }
  }
}

// ============================================
// 🔔 NOTIFICACIONES TOAST
// ============================================

function mostrarNotificacion(mensaje, tipo = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <span class="toast-icon">${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : '⚠️'}</span>
    <span class="toast-message">${mensaje}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.4s forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================
// ☁️ GOOGLE SHEETS API
// ============================================

function enviarAGoogleSheets(datos) {
  if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI' || !GOOGLE_SCRIPT_URL) {
    console.warn('⚠️ Falta configurar la URL de Google Sheets en el script.');
    return;
  }

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify(datos)
  }).then(() => console.log('✅ Pedido guardado en Sheets'))
    .catch(err => console.error('❌ Error guardando en Sheets:', err));
}

// ============================================
// ☁️ FIREBASE FUNCTIONS (TESIS)
// ============================================

async function guardarTesisEnFirebase() {
  if (!ultimaCotizacion) {
    calcular();
    if (!ultimaCotizacion) return;
  }

  // ABRIR MODAL EN LUGAR DE PROMPT
  const modal = document.getElementById('modalGuardarTesis');
  const input = document.getElementById('inputNombreTesis');
  
  if (modal && input) {
    input.value = "Cliente Tesis"; // Valor por defecto
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
  }
}

async function confirmarGuardarTesis() {
  const nombre = document.getElementById('inputNombreTesis').value || "Cliente Tesis";
  document.getElementById('modalGuardarTesis').classList.add('hidden');

  if (!nombre) return;

  // Recopilar inputs actuales
  const inputs = {
    tamano: elementos.tamano.value,
    papel: elementos.papel.value,
    bn: document.getElementById('bn').value,
    color: document.getElementById('color').value,
    paginas: document.getElementById('paginas').value,
    tomos: document.getElementById('tomos').value,
    tipoEmpastado: elementos.tipoEmpastado.value,
    colorTapa: document.getElementById('colorTapa').value,
    lomo: document.getElementById('lomo').value,
    llevaCd: elementos.llevaCd.value,
    cantidadCd: document.getElementById('cantidadCd').value
  };

  const paqueteDeDatos = {
    fecha: new Date().toISOString(),
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    tipo: "Tesis",
    nombre: nombre,
    total: datosParaGuardar.total,
    descripcion: `Tesis: ${inputs.tomos} tomos, ${nombreColor(inputs.tamano)}, ${nombreColor(inputs.papel)}, ${nombreColor(inputs.tipoEmpastado)}`,
    detalle_tecnico: datosParaGuardar.detalle,
    inputs: inputs
  };

  try {
    await db.ref("cotizaciones").push(paqueteDeDatos);
    mostrarNotificacion(`✅ Tesis guardada correctamente`, "success");
  } catch (error) {
    console.error("❌ Error:", error);
    mostrarNotificacion("Error al guardar: " + error.message, "error");
  }
}

async function abrirModalCotizaciones() {
  const container = document.getElementById('listaCotizacionesGuardadas');
  if (container) container.innerHTML = '<div class="text-center py-10"><p class="text-xl animate-pulse">🔥 Cargando desde Base de Datos...</p></div>';
  
  document.getElementById('modalCotizacionesGuardadas')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  try {
    // OPTIMIZACIÓN: Filtrar por tipo 'Tesis' y traer solo las últimas 20
    // Requiere regla en Firebase: "cotizaciones": { ".indexOn": ["tipo"] }
    const snapshot = await db.ref("cotizaciones").orderByChild("tipo").equalTo("Tesis").limitToLast(20).once("value");
    const data = snapshot.val();

    if (data) {
      todasLasCotizaciones = Object.keys(data).map(key => ({
        ...data[key], // 1. Cargar datos primero
        id: key       // 2. SOBRESCRIBIR con la clave real de Firebase
      })).sort((a, b) => {
        return new Date(b.fecha || b.fechaISO) - new Date(a.fecha || a.fechaISO);
      });
    } else {
      todasLasCotizaciones = [];
    }

    renderizarCotizacionesGuardadas();
  } catch (error) {
    console.error("Error cargando cotizaciones:", error);
    if (container) container.innerHTML = '<p class="text-center text-red-500 py-8">Error al cargar las cotizaciones.</p>';
  }
}

function cerrarModalCotizaciones() {
  document.getElementById('modalCotizacionesGuardadas')?.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

function renderizarCotizacionesGuardadas() {
  const container = document.getElementById('listaCotizacionesGuardadas');
  if (!container) return;

  if (todasLasCotizaciones.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 py-8">No hay cotizaciones guardadas.</p>`;
    return;
  }

  container.innerHTML = todasLasCotizaciones.map(c => {
    let fechaObj = new Date();
    if (c.timestamp && c.timestamp.toDate) fechaObj = c.timestamp.toDate();
    else if (c.fecha) fechaObj = new Date(c.fecha);
    
    const fechaStr = fechaObj.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const total = Number(c.total || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    const esTesis = c.tipo === 'Tesis';
    const icono = esTesis ? '🎓' : '📄';
    
    // Solo permitimos cargar si es Tesis, o borrar cualquiera
    const btnCargar = esTesis 
      ? `<button onclick="cargarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none py-2 px-3 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm whitespace-nowrap">📂 Cargar</button>`
      : `<span class="text-xs text-gray-400 italic px-2 self-center">Ir a General para editar</span>`;

    return `
      <div class="p-4 mb-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-blue-50 transition-colors">
        <div class="flex-grow w-full md:w-auto">
          <p class="font-bold text-lg text-blue-700 dark:text-blue-400 break-words">${icono} ${c.nombre}</p>
          <p class="text-sm text-gray-500">${fechaStr} - ${c.descripcion || 'Sin descripción'}</p>
          <p class="text-md font-semibold text-gray-800 mt-1">Total: RD$${total}</p>
        </div>
        <div class="flex flex-wrap gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
          ${btnCargar}
          <button onclick="eliminarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none py-2 px-3 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm whitespace-nowrap">🗑️ Borrar</button>
        </div>
      </div>
    `;
  }).join('');
}

function cargarCotizacionGuardada(id) {
  const cotizacion = todasLasCotizaciones.find(c => c.id === id);
  if (cotizacion && cotizacion.inputs) {
    const d = cotizacion.inputs;
    
    if (d.tamano) elementos.tamano.value = d.tamano;
    if (d.papel) elementos.papel.value = d.papel;
    if (d.bn) document.getElementById('bn').value = d.bn;
    if (d.color) document.getElementById('color').value = d.color;
    if (d.paginas) document.getElementById('paginas').value = d.paginas;
    if (d.tomos) document.getElementById('tomos').value = d.tomos;
    if (d.tipoEmpastado) elementos.tipoEmpastado.value = d.tipoEmpastado;
    if (d.colorTapa) document.getElementById('colorTapa').value = d.colorTapa;
    if (d.lomo) document.getElementById('lomo').value = d.lomo;
    if (d.llevaCd) elementos.llevaCd.value = d.llevaCd;
    if (d.cantidadCd) document.getElementById('cantidadCd').value = d.cantidadCd;

    actualizarVista();
    toggleSeccionCD();
    calcular(); // Recalcular automáticamente
    cerrarModalCotizaciones();
    mostrarNotificacion(`Tesis de "${cotizacion.nombre}" cargada`, 'success');
  }
}
