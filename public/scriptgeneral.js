// ============================================
// 📝 COTIZACIÓN - GLOBAL
// ============================================
let cotizacion = [];
let todasLasCotizaciones = []; // Para guardar múltiples cotizaciones
let idCotizacionActiva = null; // Para saber si estamos editando una cotización existente
let nombreCotizacionActiva = ''; // Para recordar el nombre del cliente y que no se borre
let cotizacionAFacturar = null; // Variable temporal para el proceso de facturación
let todasLasFacturas = []; // Para el historial de facturas
let searchDebounceTimer; // Timer para la búsqueda
let idFacturaAAnular = null; // Variable temporal para anulación segura
let idCotizacionAEliminar = null; // Variable temporal para eliminar cotización
let isGeneratingPDF = false; // Flag para evitar doble click en la generación de PDF

console.log('🚀 Script cargando...');

// ============================================
// 🛡️ INTERRUPTOR DE SEGURIDAD
// ============================================
// FALSE = Modo Desarrollo (Todo abierto, fácil de trabajar)
// TRUE  = Modo Producción (Pide login para facturar)
const ACTIVAR_SEGURIDAD = true; 

// ============================================
// 🔥 CONFIGURACIÓN DE FIREBASE (BASE DE DATOS)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBgVrMPSwZg3O5zbuIozstpG0bM8XFEeZE",
  authDomain: "servigaco.firebaseapp.com",
  databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
  projectId: "servigaco",
  storageBucket: "servigaco.firebasestorage.app",
  messagingSenderId: "516579834487",
  appId: "1:516579834487:web:e7fb1c46d93bb62a98a472"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth(); // Inicializar Auth

document.addEventListener('DOMContentLoaded', () => {
  cargarDeLocalStorage(); // Carga la cotización en curso si la página se recarga
});

// ============================================
// 💰 TABLAS DE PRECIOS ACTUALIZADAS
// ============================================

// IMPRESIONES B/N (Blanco y Negro)
const preciosBN = {
  'carta': [
    { min: 1, max: 50, precio: 2.50 },
    { min: 51, max: 200, precio: 2.00 },
    { min: 201, max: Infinity, precio: 1.75 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 10.00 },
    { min: 51, max: 200, precio: 8.00 },
    { min: 201, max: Infinity, precio: 6.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 20.00 },
    { min: 51, max: 200, precio: 15.00 },
    { min: 201, max: Infinity, precio: 10.00 }
  ]
};

// IMPRESIONES COLOR (papel bond)
const preciosColor = {
  'carta': [
    { min: 1, max: 50, precio: 15.00 },
    { min: 51, max: 200, precio: 10.00 },
    { min: 201, max: Infinity, precio: 8.00 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 30.00 },
    { min: 51, max: 200, precio: 25.00 },
    { min: 201, max: Infinity, precio: 20.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 40.00 },
    { min: 51, max: 200, precio: 35.00 },
    { min: 201, max: Infinity, precio: 30.00 }
  ]
};

// IMPRESIONES FULL COLOR (papel bond)
const preciosFullColor = {
  'carta': [
    { min: 1, max: 50, precio: 20.00 },
    { min: 51, max: 200, precio: 18.00 },
    { min: 201, max: Infinity, precio: 15.00 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 35.00 },
    { min: 51, max: 200, precio: 30.00 },
    { min: 201, max: Infinity, precio: 25.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 60.00 },
    { min: 51, max: 200, precio: 50.00 },
    { min: 201, max: Infinity, precio: 40.00 }
  ]
};

// IMPRESIONES EN CARTONITE, SATINADO Y ADHESIVO
const preciosEspeciales = {
  'carta': [
    { min: 1, max: 50, precio: 35.00 },
    { min: 51, max: 200, precio: 30.00 },
    { min: 201, max: Infinity, precio: 25.00 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 45.00 },
    { min: 51, max: 200, precio: 40.00 },
    { min: 201, max: Infinity, precio: 35.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 70.00 },
    { min: 51, max: 200, precio: 60.00 },
    { min: 201, max: Infinity, precio: 50.00 }
  ]
};

// Encuadernado Espiral (precio por encuadernado según páginas)
const preciosEncuadernado = [
  { min: 1, max: 100, precio: 60 },
  { min: 101, max: 160, precio: 70 },
  { min: 161, max: 200, precio: 80 },
  { min: 201, max: 300, precio: 100 },
  { min: 301, max: 400, precio: 120 },
  { min: 401, max: 500, precio: 150 },
  { min: 501, max: Infinity, precio: 250 }
];

// Empastado (precio por unidad)
const preciosEmpastado = {
  'Tapa Dura': { carta: 500, legal: 800, tabloide: 1000 },
  'Tapa Blanda': { carta: 350 }
};

// Plastificado (precio base por tamaño)
const preciosPlastificado = {
  cedula: 30,
  carta: 40,
  legal: 50,
  tabloide: 60
};

// ============================================
// 🧮 FUNCIONES DE CÁLCULO
// ============================================

function calcularPrecioImpresion(cantidad, tipo, tamano) {
  let tablaPrecios;
  
  switch (tipo) {
    case 'bn':
      tablaPrecios = preciosBN[tamano];
      break;
    case 'color':
      tablaPrecios = preciosColor[tamano];
      break;
    case 'full_color':
      tablaPrecios = preciosFullColor[tamano];
      break;
    case 'especial':
      tablaPrecios = preciosEspeciales[tamano];
      break;
    default:
      return 0;
  }
  
  if (!tablaPrecios) return 0;
  
  // Buscar el rango correspondiente
  const rango = tablaPrecios.find(r => cantidad >= r.min && cantidad <= r.max);
  
  if (!rango) return 0;
  
  // Precio total = cantidad × precio unitario del rango
  return cantidad * rango.precio;
}

function calcularPrecioEncuadernado(paginas) {
  const rango = preciosEncuadernado.find(r => paginas >= r.min && paginas <= r.max);
  return rango ? rango.precio : 0;
}

function calcularPrecioEmpastado(tipo, tamano) {
  return preciosEmpastado[tipo]?.[tamano] || 0;
}

function calcularPrecioPloteo(tipo, tamano, cantidad, anchoCustom = 0, altoCustom = 0) {
  // Precios Bond Full Color (precio completo)
  const preciosBondFullColor = {
    '17x22': 150,
    '18x24': 150,
    '24x36': 360
  };
  
  // Precios Bond Color Normal (mitad del full color)
  const preciosBondColor = {
    '17x22': 75,
    '18x24': 75,
    '24x36': 180
  };
  
  // Precios Bond B/N
  const preciosBondBN = {
    '17x22': 50,
    '18x24': 50,
    '24x36': 90
  };
  
  // Precios por pie cuadrado
  const preciosPorPie = {
    'cartonite': 80,
    'fotografico': 160,
    'lona': 100,
    'cintra': 250,
    'canvas': 300
  };
  
  // Si es tamaño personalizado
  if (tamano === 'custom') {
    const pulgadasCuadradas = anchoCustom * altoCustom;
    const piesCuadrados = pulgadasCuadradas / 144;
    const precioPorPie = preciosPorPie[tipo] || 100;
    return piesCuadrados * precioPorPie * cantidad;
  }
  
  // Si es Bond B/N
  if (tipo === 'bond_bn') {
    const precioUnitario = preciosBondBN[tamano] || 0;
    return precioUnitario * cantidad;
  }
  
  // Si es Bond Color
  if (tipo === 'bond_color') {
    const precioUnitario = preciosBondColor[tamano] || 0;
    return precioUnitario * cantidad;
  }
  
  // Si es Bond Full Color
  if (tipo === 'bond_full_color') {
    const precioUnitario = preciosBondFullColor[tamano] || 0;
    return precioUnitario * cantidad;
  }
  
  // Si es material por pie cuadrado (cartonite, fotográfico, etc.)
  const [ancho, alto] = tamano.split('x').map(Number);
  const pulgadasCuadradas = ancho * alto;
  const piesCuadrados = pulgadasCuadradas / 144;
  const precioPorPie = preciosPorPie[tipo] || 100;
  
  return piesCuadrados * precioPorPie * cantidad;
}

function calcularPrecioPlastificado(tamano, llevaCorte, cantidadHojas, piezasPorHoja = 1) {
  const precioBase = preciosPlastificado[tamano] || 0;
  
  if (llevaCorte) {
    // Si lleva corte, se cobra por cada pieza individual
    const totalPiezas = cantidadHojas * piezasPorHoja;
    return precioBase * totalPiezas;
  } else {
    // Sin corte, se cobra por hoja completa
    return precioBase * cantidadHojas;
  }
}

// ============================================
// 📝 FUNCIONES DE COTIZACIÓN
// ============================================

function agregarACotizacion(servicio) {
  cotizacion.push(servicio);
  actualizarCotizacion();
  mostrarNotificacion('Servicio agregado correctamente', 'success');
}

function eliminarDeCotizacion(index) {
  cotizacion.splice(index, 1);
  actualizarCotizacion();
  mostrarNotificacion('Servicio eliminado', 'warning');
}

function cambiarCantidad(index, delta) {
  const item = cotizacion[index];
  if (!item) return;

  const nuevaCantidad = (item.cantidad || 1) + delta;
  if (nuevaCantidad < 1) return;

  // Actualizar descripción si empieza con el número anterior (para mantener coherencia visual)
  const cantidadAnterior = item.cantidad || 1;
  if (item.descripcion && item.descripcion.startsWith(cantidadAnterior.toString())) {
     item.descripcion = item.descripcion.replace(new RegExp('^' + cantidadAnterior), nuevaCantidad);
  }

  item.cantidad = nuevaCantidad;
  
  if (item.precioUnitario !== undefined) {
    item.precio = item.precioUnitario * nuevaCantidad;
  }

  actualizarCotizacion();
}

function limpiarCotizacion() {
  if (cotizacion.length === 0) {
    mostrarNotificacion('La cotización ya está vacía', 'warning');
    return;
  }
  
  // ABRIR MODAL EN LUGAR DE CONFIRM
  const modal = document.getElementById('modalConfirmarLimpiar');
  const texto = document.getElementById('textoConfirmarLimpiar');
  
  if (modal && texto) {
    texto.textContent = idCotizacionActiva
    ? '¿Salir de la edición y limpiar? Los cambios no guardados se perderán.'
    : '¿Limpiar toda la cotización actual?';
    
    modal.classList.remove('hidden');
  }
}

function ejecutarLimpiarCotizacion() {
  cotizacion = [];
  idCotizacionActiva = null;
  localStorage.removeItem('cotizacion_servigaco_id');
  localStorage.removeItem('cotizacion_servigaco_nombre');
  actualizarCotizacion();
  document.getElementById('modalConfirmarLimpiar').classList.add('hidden');
  mostrarNotificacion('Cotización limpiada', 'success');
}

function actualizarCotizacion() {
  const contador = document.getElementById('cotizacionCount');
  const cuerpoTabla = document.getElementById('cotizacionBody');
  const footerTabla = document.getElementById('cotizacionFooter');
  const subtotalEl = document.getElementById('subtotalAmount');
  const impuestoEl = document.getElementById('impuestoAmount');
  const impuestoRow = document.getElementById('impuestoRow');
  const subtotalRow = document.getElementById('subtotalRow');
  const totalEl = document.getElementById('totalAmount');
  const comprobanteSection = document.getElementById('comprobanteSection');
  const cotizacionAcciones = document.getElementById('cotizacionAcciones');
  const btnGuardar = document.getElementById('btnGuardarCotizacion');
  const btnCambios = document.getElementById('btnGuardarCambios');

  // Guardar en LocalStorage cada vez que cambia
  guardarEnLocalStorage();

  // Indicador de edición
  const headerH2 = document.querySelector('.cotizacion-header h2');
  const existingIndicator = headerH2?.querySelector('.editing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (contador) contador.textContent = cotizacion.length;

  if (cotizacion.length === 0) {
    if (cuerpoTabla) {
      cuerpoTabla.innerHTML = `
        <tr class="cotizacion-vacia bg-gray-50 dark:bg-gray-800">
          <td colspan="6" class="p-12 text-center">
            <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <span class="text-6xl mb-4">📭</span>
              <p class="text-lg font-medium">No hay servicios en la cotización</p>
              <p class="text-sm text-gray-400 mt-1">Selecciona un servicio abajo para empezar</p>
            </div>
          </td>
        </tr>
      `;
    }
    if (footerTabla) footerTabla.style.display = 'none';
    if (comprobanteSection) comprobanteSection.style.display = 'none';
    if (cotizacionAcciones) cotizacionAcciones.style.display = 'none';
    return;
  }

  // Añadir indicador si se está editando
  if (idCotizacionActiva && headerH2) {
    const nombre = nombreCotizacionActiva || '...';
    const indicator = document.createElement('span');
    indicator.className = 'editing-indicator ml-4 text-sm font-normal bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 px-3 py-1 rounded-full';
    indicator.textContent = `📝 Editando: ${nombre}`;
    headerH2.appendChild(indicator);
  }

  // Alternar botones según si estamos editando o creando
  if (idCotizacionActiva) {
    if (btnGuardar) btnGuardar.style.display = 'none';
    if (btnCambios) btnCambios.style.display = 'flex';
  } else {
    if (btnGuardar) btnGuardar.style.display = 'flex';
    if (btnCambios) btnCambios.style.display = 'none';
  }

  if (comprobanteSection) comprobanteSection.style.display = 'block';
  if (cotizacionAcciones) cotizacionAcciones.style.display = 'flex';
  if (footerTabla) footerTabla.style.display = 'table-footer-group';

  const subtotal = cotizacion.reduce((sum, item) => sum + item.precio, 0);
  const tipoComp = document.getElementById('tipoComprobante')?.value || 'ninguno';

  let impuesto = 0;
  let nombreImpuesto = '';
  if (tipoComp === 'fiscal') { impuesto = subtotal * 0.18; nombreImpuesto = 'ITBIS (18%)'; }
  else if (tipoComp === 'gubernamental') { impuesto = subtotal * 0.10; nombreImpuesto = 'ISR (10%)'; }

  const total = subtotal + impuesto;

  if (subtotalEl) subtotalEl.textContent = `RD$${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (tipoComp !== 'ninguno') {
    if (subtotalRow) subtotalRow.style.display = 'table-row';
    if (impuestoRow) {
      impuestoRow.style.display = 'table-row';
      const label = impuestoRow.querySelector('.total-label');
      if (label) label.textContent = nombreImpuesto + ':';
      if (impuestoEl) impuestoEl.textContent = `RD$${impuesto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
  } else {
    if (subtotalRow) subtotalRow.style.display = 'none';
    if (impuestoRow) impuestoRow.style.display = 'none';
  }

  if (totalEl) totalEl.textContent = `RD$${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (cuerpoTabla) {
    cuerpoTabla.innerHTML = cotizacion.map((item, i) => `
      <tr class="bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-150 group border-b border-gray-50 dark:border-gray-700 last:border-none">
        <td class="px-6 py-4 text-gray-800 dark:text-gray-100 font-medium break-words">${item.nombre}</td>
        <td class="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm break-words">${item.descripcion}</td>
        <td class="px-6 py-4 text-center text-gray-700 dark:text-gray-200 font-medium bg-gray-50/50 dark:bg-gray-700/50">
          <div class="flex items-center justify-center gap-2">
            <button onclick="cambiarCantidad(${i}, -1)" class="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold flex items-center justify-center text-xs transition-colors" type="button">−</button>
            <span>${item.cantidad || 1}</span>
            <button onclick="cambiarCantidad(${i}, 1)" class="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 font-bold flex items-center justify-center text-xs transition-colors" type="button">+</button>
          </div>
        </td>
        <td class="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-medium">RD$${(item.precioUnitario || item.precio).toFixed(2)}</td>
        <td class="px-6 py-4 text-right font-bold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/20">RD$${item.precio.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
        <td class="px-6 py-4 text-center">
          <button class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-100 transition-all duration-200 transform hover:scale-110 shadow-sm border border-transparent hover:border-red-200" onclick="eliminarDeCotizacion(${i})" title="Eliminar">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// ============================================
// ➕ AGREGAR SERVICIOS
// ============================================

function agregarImpresion() {
  const cant = parseInt(document.getElementById('cantidadPaginas')?.value);
  const tipo = document.getElementById('tipoImpresion')?.value;
  const tamano = document.getElementById('tamanoImpresion')?.value;
  const caras = document.getElementById('caras')?.value;
  const manual = parseFloat(document.getElementById('precioPersonalImpresion')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (!tipo) { mostrarNotificacion('Seleccione el tipo de impresión', 'error'); return; }
  if (!tamano) { mostrarNotificacion('Seleccione el tamaño', 'error'); return; }

  const tipos = { 
    bn: 'B/N', 
    color: 'Color', 
    full_color: 'Full Color',
    especial: 'Cartonite/Satinado/Adhesivo'
  };
  
  const tamanos = {
    carta: '8½ x 11 (Carta)',
    legal: '8½ x 14 (Legal)',
    tabloide: '11 x 17 (Tabloide)'
  };
  
  let precio;
  
  // ✅ CORRECCIÓN: Precio manual es POR PÁGINA
  if (manual) {
    precio = manual * cant; // Precio manual × cantidad de páginas
  } else {
    precio = calcularPrecioImpresion(cant, tipo, tamano);
    
    if (precio === 0) {
      mostrarNotificacion('No se pudo calcular el precio. Use precio personalizado.', 'error');
      return;
    }
  }

  const carasTexto = caras === 'doble' ? 'Doble Cara' : 'Simple Cara';
  const hojas = caras === 'doble' ? Math.ceil(cant / 2) : cant;
  
  agregarACotizacion({ 
    nombre: `Impresión ${tipos[tipo]}`, 
    descripcion: `${cant} páginas (${hojas} hojas) · ${tamanos[tamano]} · ${carasTexto}`, 
    cantidad: cant,
    precioUnitario: precio / cant,
    precio 
  });
  limpiarFormulario('formImpresion');
}



// ============================================
// 📘 FUNCIÓN MEJORADA: LIBRO COMPLETO
// Permite especificar páginas B/N, Color y Full Color por separado
// ============================================

function agregarLibro() {
  // Obtener valores de los campos
  const paginasBN = parseInt(document.getElementById('libroPaginasBN')?.value || 0);
  const paginasColor = parseInt(document.getElementById('libroPaginasColor')?.value || 0);
  const paginasFullColor = parseInt(document.getElementById('libroPaginasFullColor')?.value || 0);
  const tamano = document.getElementById('libroTamano')?.value || 'carta';
  const tipoTerminacion = document.getElementById('libroTerminacion')?.value || 'ninguna';
  const juegos = parseInt(document.getElementById('libroJuegos')?.value || 1);

  // Validaciones
  const totalPaginas = paginasBN + paginasColor + paginasFullColor;
  
  if (totalPaginas === 0) {
    mostrarNotificacion('Debe especificar al menos 1 página', 'error');
    return;
  }

  if (!juegos || juegos <= 0) {
    mostrarNotificacion('Número de juegos inválido', 'error');
    return;
  }

  // Validar tapa blanda solo para carta
  if (tipoTerminacion === 'tapa_blanda' && tamano !== 'carta') {
    mostrarNotificacion('Tapa blanda solo disponible para carta', 'error');
    return;
  }

  // ===============================================
  // CALCULAR COSTOS POR SEPARADO
  // ===============================================
  
  let costoBN = 0;
  let costoColor = 0;
  let costoFullColor = 0;
  let costoTerminacion = 0;

  // 1. Calcular costo de impresión B/N
  // NOTA: Calculamos en base al VOLUMEN TOTAL (páginas * juegos) para aplicar el precio correcto de mayoreo
  if (paginasBN > 0) {
    const totalPaginasBN = paginasBN * juegos;
    const precioTotalBN = calcularPrecioImpresion(totalPaginasBN, 'bn', tamano);
    costoBN = precioTotalBN / juegos; // Precio por libro individual
  }

  // 2. Calcular costo de impresión Color
  if (paginasColor > 0) {
    const totalPaginasColor = paginasColor * juegos;
    const precioTotalColor = calcularPrecioImpresion(totalPaginasColor, 'color', tamano);
    costoColor = precioTotalColor / juegos;
  }

  // 3. Calcular costo de impresión Full Color
  if (paginasFullColor > 0) {
    const totalPaginasFull = paginasFullColor * juegos;
    const precioTotalFull = calcularPrecioImpresion(totalPaginasFull, 'full_color', tamano);
    costoFullColor = precioTotalFull / juegos;
  }

  // 4. Calcular costo de terminación (si aplica)
  if (tipoTerminacion === 'espiral') {
    costoTerminacion = calcularPrecioEncuadernado(totalPaginas);
  } else if (tipoTerminacion === 'tapa_dura') {
    costoTerminacion = calcularPrecioEmpastado('Tapa Dura', tamano);
  } else if (tipoTerminacion === 'tapa_blanda') {
    costoTerminacion = calcularPrecioEmpastado('Tapa Blanda', tamano);
  }

  // 5. Costo total por libro individual
  const costoPorLibro = costoBN + costoColor + costoFullColor + costoTerminacion;

  // 6. Costo total (multiplicado por cantidad de juegos)
  const costoTotal = costoPorLibro * juegos;

  // ===============================================
  // CONSTRUIR DESCRIPCIÓN DETALLADA
  // ===============================================
  
  const tamanos = {
    carta: '8½ x 11',
    legal: '8½ x 14',
    tabloide: '11 x 17'
  };

  const terminacionTexto = {
    'espiral': 'Encuadernado espiral',
    'tapa_dura': 'Empastado tapa dura',
    'tapa_blanda': 'Empastado tapa blanda',
    'ninguna': 'Sin terminación'
  };

  // Construir descripción detallada
  let descripcion = `${juegos} libro(s) · ${totalPaginas} páginas totales · ${tamanos[tamano]}`;
  
  // Desglose de páginas
  let desglosePaginas = [];
  if (paginasBN > 0) desglosePaginas.push(`${paginasBN} B/N`);
  if (paginasColor > 0) desglosePaginas.push(`${paginasColor} Color`);
  if (paginasFullColor > 0) desglosePaginas.push(`${paginasFullColor} Full Color`);
  
  if (desglosePaginas.length > 0) {
    descripcion += `\n(${desglosePaginas.join(' + ')})`;
  }
  
  descripcion += `\n${terminacionTexto[tipoTerminacion]}`;

  // Desglose de costos (opcional, para transparencia)
  let desgloseCostos = [];
  if (costoBN > 0) desgloseCostos.push(`B/N: RD$${costoBN.toFixed(2)}`);
  if (costoColor > 0) desgloseCostos.push(`Color: RD$${costoColor.toFixed(2)}`);
  if (costoFullColor > 0) desgloseCostos.push(`Full Color: RD$${costoFullColor.toFixed(2)}`);
  if (costoTerminacion > 0) desgloseCostos.push(`${terminacionTexto[tipoTerminacion]}: RD$${costoTerminacion.toFixed(2)}`);
  
  if (desgloseCostos.length > 0 && juegos === 1) {
    descripcion += `\n[${desgloseCostos.join(' + ')}]`;
  } else if (desgloseCostos.length > 0 && juegos > 1) {
    descripcion += `\nCosto unitario: RD$${costoPorLibro.toFixed(2)}`;
  }

  // ===============================================
  // AGREGAR A COTIZACIÓN
  // ===============================================
  
  agregarACotizacion({
    nombre: '📘 Libro Completo',
    descripcion: descripcion,
    cantidad: juegos,
    precioUnitario: costoPorLibro,
    precio: costoTotal
  });

  // Limpiar formulario
  limpiarFormulario('formLibro');
  
  // Ocultar resumen
  const resumenDiv = document.getElementById('resumenLibro');
  if (resumenDiv) resumenDiv.style.display = 'none';
}

function agregarEncuadernado() {
  const pag = parseInt(document.getElementById('paginasEncuadernado')?.value);
  const cant = parseInt(document.getElementById('cantidadEncuadernado')?.value || 1);
  const manual = parseFloat(document.getElementById('precioPersonalEncuadernado')?.value || 0);

  if (!pag || pag <= 0) { mostrarNotificacion('Páginas inválidas', 'error'); return; }
  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }

  // Validar límite máximo
  if (pag > 1000 && !manual) {
    mostrarNotificacion('Límite de 1000 páginas. Use precio personalizado.', 'warning');
    return;
  }

  // ✅ CORRECCIÓN: Precio manual es POR UNIDAD
  let precioUnitario;
  if (manual) {
    precioUnitario = manual; // Precio manual es por encuadernado
  } else {
    precioUnitario = calcularPrecioEncuadernado(pag);
  }
  
  if (precioUnitario === 0 && !manual) {
    mostrarNotificacion('No se puede calcular. Use precio personalizado.', 'error');
    return;
  }
  
  const precioTotal = precioUnitario * cant; // ✅ SIEMPRE multiplica

  agregarACotizacion({ 
    nombre: 'Encuadernado Espiral', 
    descripcion: `${cant} encuadernado(s) de ${pag} páginas`, 
    cantidad: cant,
    precioUnitario: precioUnitario,
    precio: precioTotal 
  });
  limpiarFormulario('formEncuadernado');
}

function agregarEmpastado() {
  const tipoRaw = document.getElementById('tipoEmpastadoGeneral')?.value;
  const tam = document.getElementById('tamanoEmpastado')?.value;
  const cant = parseInt(document.getElementById('cantidadEmpastado')?.value);
  const manual = parseFloat(document.getElementById('precioPersonalEmpastado')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }

  const tipoMap = { tapa_dura: 'Tapa Dura', tapa_blanda: 'Tapa Blanda' };
  const tipo = tipoMap[tipoRaw];
  
  // Validar tapa blanda solo para carta
  if (tipoRaw === 'tapa_blanda' && tam !== 'carta') {
    mostrarNotificacion('Tapa blanda solo para carta. Use personalizado.', 'warning');
    return;
  }
  
  // ✅ CORRECCIÓN: Precio manual es POR UNIDAD
  let precioUnitario;
  if (manual) {
    precioUnitario = manual; // Precio manual es por empastado
  } else {
    precioUnitario = calcularPrecioEmpastado(tipo, tam);
  }
  
  if (precioUnitario === 0 && !manual) {
    mostrarNotificacion('Tamaño no disponible. Use precio personalizado.', 'error');
    return;
  }
  
  const precioTotal = precioUnitario * cant; // ✅ SIEMPRE multiplica
  const tamanoTexto = tam === 'carta' ? '8.5x11' : tam === 'legal' ? '8.5x14' : '11x17';

  agregarACotizacion({ 
    nombre: `Empastado ${tipo}`, 
    descripcion: `${cant} empastado(s) ${tamanoTexto}`, 
    cantidad: cant,
    precioUnitario: precioUnitario,
    precio: precioTotal 
  });
  limpiarFormulario('formEmpastado');
}

function agregarPloteo() {
  const tipoPloteo = document.getElementById('tipoPloteo')?.value;
  const tipoTam = document.getElementById('opcionTamanoPloteo')?.value;
  const tam = document.getElementById('tamanoPloteo')?.value;
  const cant = parseInt(document.getElementById('cantidadPloteo')?.value);
  const ancho = parseFloat(document.getElementById('anchoPloteo')?.value || 0);
  const alto = parseFloat(document.getElementById('altoPloteo')?.value || 0);
  const manual = parseFloat(document.getElementById('precioPersonalPloteo')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (tipoTam === 'personalizado' && (!ancho || !alto)) { mostrarNotificacion('Ingrese ancho y alto', 'error'); return; }

  let precio;
  let precioUnitario;
  let desc;
  
  // ✅ CORRECCIÓN: Precio manual es POR UNIDAD
  if (manual) {
    precio = manual * cant; // Precio manual × cantidad (total)
    precioUnitario = manual;
  } else if (tipoTam === 'personalizado') {
    precio = calcularPrecioPloteo(tipoPloteo, 'custom', cant, ancho, alto);
    precioUnitario = precio / cant;
  } else {
    precio = calcularPrecioPloteo(tipoPloteo, tam, cant);
    precioUnitario = precio / cant;
  }
  
  const tipoTexto = {
    'bond_bn': 'Bond B/N',
    'bond_color': 'Bond Color',
    'bond_full_color': 'Bond Full Color',
    'cartonite': 'Cartonite',
    'fotografico': 'Fotográfico',
    'canvas': 'Canvas',
    'lona': 'Lona',
    'cintra': 'Cintra'
  };
  
  desc = tipoTam === 'personalizado' ?
    `${cant} ${tipoTexto[tipoPloteo]} · ${ancho}" x ${alto}"` :
    `${cant} ${tipoTexto[tipoPloteo]} · ${tam}`;

  agregarACotizacion({
    nombre: 'Ploteo',
    descripcion: desc,
    cantidad: cant,
    precioUnitario: precioUnitario,
    precio: precio
  });
  limpiarFormulario('formPloteo');
}

function agregarPlastificado() {
  const tam = document.getElementById('tamanoPlastificado')?.value;
  const corte = document.getElementById('llevaCorte')?.value === 'si';
  const piezas = corte ? parseInt(document.getElementById('cantidadPiezas')?.value || 1) : 1;
  const cant = parseInt(document.getElementById('cantidadPlastificado')?.value);
  const manual = parseFloat(document.getElementById('precioPersonalPlastificado')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (corte && (!piezas || piezas <= 0)) { mostrarNotificacion('Cantidad de piezas inválida', 'error'); return; }

  const tamanoTexto = {
    cedula: 'Cédula',
    carta: 'Carta (8.5x11)',
    legal: 'Legal (8.5x14)',
    tabloide: 'Tabloide (11x17)'
  };
  
  const desc = corte ? 
    `${cant * piezas} piezas plastificadas y cortadas (${cant} hojas ${tamanoTexto[tam]}, ${piezas} piezas/hoja)` :
    `${cant} hoja(s) plastificadas ${tamanoTexto[tam]}`;
  
  // ✅ CORRECCIÓN: Precio manual es POR HOJA/PIEZA
  let precioTotal;
  if (manual) {
    if (corte) {
      const totalPiezas = cant * piezas;
      precioTotal = manual * totalPiezas; // Precio manual × piezas
    } else {
      precioTotal = manual * cant; // Precio manual × hojas
    }
  } else {
    precioTotal = calcularPrecioPlastificado(tam, corte, cant, piezas);
  }

  agregarACotizacion({ nombre: 'Plastificado', descripcion: desc, cantidad: corte ? cant * piezas : cant, precioUnitario: llevaCorte ? precioTotal / (cant * piezas) : precioTotal / cant, precio: precioTotal });
  limpiarFormulario('formPlastificado');
}

function agregarPersonalizado() {
  const desc = document.getElementById('descPersonalizado')?.value;
  const cant = parseInt(document.getElementById('cantPersonalizado')?.value || 1);
  const precioUnit = parseFloat(document.getElementById('precioPersonalizado')?.value || 0);

  if (!desc) { mostrarNotificacion('Ingrese una descripción', 'error'); return; }
  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (precioUnit <= 0) { mostrarNotificacion('Ingrese el precio unitario', 'error'); return; }

  const total = cant * precioUnit;

  agregarACotizacion({
    nombre: 'Servicio Personalizado',
    descripcion: desc,
    cantidad: cant,
    precioUnitario: precioUnit,
    precio: total
  });
  
  limpiarFormulario('formPersonalizado');
}

// ============================================
// 🧹 LIMPIAR FORMULARIOS
// ============================================

function limpiarFormulario(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.querySelectorAll('input[type="number"], input[type="text"]').forEach(i => i.value = '');
  form.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);

  if (formId === 'formPloteo') {
    const cf = document.getElementById('tamanoPersonalizado');
    if (cf) cf.style.display = 'none';
    const tp = document.getElementById('tamanosPredefinidos');
    if (tp) tp.style.display = 'block';
  }
  if (formId === 'formPlastificado') {
    const cc = document.getElementById('seccionPiezas');
    if (cc) cc.style.display = 'none';
  }
}

// ============================================
// 📄 GENERAR COTIZACIÓN
// ============================================

function generarCotizacion() {
  if (cotizacion.length === 0) { mostrarNotificacion('Cotización vacía', 'warning'); return; }

  let txt = '=== COTIZACIÓN ===\n\n';
  cotizacion.forEach((item, i) => {
    txt += `${i + 1}. ${item.nombre}\n   ${item.descripcion}\n   RD$${item.precio.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\n\n`;
  });

  const subtotal = cotizacion.reduce((s, i) => s + i.precio, 0);
  const tipoC = document.getElementById('tipoComprobante')?.value || 'ninguno';
  let imp = 0;

  if (tipoC === 'fiscal') { 
    imp = subtotal * 0.18; 
    txt += `Subtotal: RD$${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\nITBIS (18%): RD$${imp.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\n`; 
  } else if (tipoC === 'gubernamental') { 
    imp = subtotal * 0.10; 
    txt += `Subtotal: RD$${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\nISR (10%): RD$${imp.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\n`; 
  }

  txt += `\nTOTAL: RD$${(subtotal + imp).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  
  // Guardar registro en Firebase
  registrarLogVenta({
    tipo: 'General',
    total: (subtotal + imp).toFixed(2),
    detalle: cotizacion.map(i => `• ${i.cantidad}x ${i.nombre} - RD$${i.precio.toFixed(2)}`).join('\n')
  });

  // En lugar de alert, copiamos al portapapeles o usamos la notificación
  mostrarNotificacion('Resumen generado (ver PDF para detalle)', 'success');
}

// ============================================
// 💾 EXPORTACIÓN A SISTEMA LEGACY (VIEJO)
// ============================================

function exportarParaSistemaViejo() {
  if (cotizacion.length === 0) {
    mostrarNotificacion('No hay datos para exportar', 'warning');
    return;
  }

  // 1. Definir el formato. La mayoría de sistemas viejos aceptan CSV (valores separados por comas)
  // Formato genérico: CODIGO, CANTIDAD, DESCRIPCION, PRECIO_UNITARIO, TOTAL
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Encabezados (Opcional: algunos sistemas viejos no quieren encabezados, puedes comentar esta línea)
  csvContent += "Codigo,Cantidad,Descripcion,PrecioUnitario,Total\r\n";

  cotizacion.forEach((item, index) => {
    // Limpiamos la descripción para quitar comas o saltos de línea que rompan el CSV
    const descripcionLimpia = item.descripcion.replace(/(\r\n|\n|\r)/gm, " ").replace(/,/g, " ");
    const codigo = `SERV-${index + 1}`; // Generamos un código genérico
    
    // Construimos la línea
    const row = `${codigo},${item.cantidad},"${item.nombre} - ${descripcionLimpia}",${item.precioUnitario.toFixed(2)},${item.precio.toFixed(2)}`;
    csvContent += row + "\r\n";
  });

  // 2. Crear enlace de descarga invisible
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `importacion_factura_${new Date().getTime()}.csv`);
  document.body.appendChild(link); // Requerido para Firefox
  link.click();
  document.body.removeChild(link);
  
  mostrarNotificacion('Archivo de integración descargado', 'success');
}

// ============================================
// 🧭 NAVEGACIÓN
// ============================================

function marcarPaginaActiva() {
  const pag = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (pag === 'index.html' || pag === '') document.getElementById('navTesis')?.classList.add('active');
  else if (pag === 'calculadora_general.html') document.getElementById('navGeneral')?.classList.add('active');
}

function configurarMenuMovil() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const exp = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !exp);
    links.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      links.classList.remove('active');
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.main-nav')) {
      toggle.setAttribute('aria-expanded', 'false');
      links.classList.remove('active');
    }
  });
}

// ============================================
// 🎯 EVENT LISTENERS
// ============================================

function inicializarEventListeners() {
  const tipoSrv = document.getElementById('tipoServicio');
  if (tipoSrv) {
    tipoSrv.addEventListener('change', e => {
      const val = e.target.value;
      document.querySelectorAll('.form-servicio').forEach(f => f.style.display = 'none');
      if (val) {
        const formId = `form${val.charAt(0).toUpperCase() + val.slice(1)}`;
        const form = document.getElementById(formId);
        if (form) form.style.display = 'block';
      }
    });
  }

  const tamPlot = document.getElementById('opcionTamanoPloteo');
  if (tamPlot) {
    tamPlot.addEventListener('change', e => {
      const cf = document.getElementById('tamanoPersonalizado');
      const tp = document.getElementById('tamanosPredefinidos');
      if (e.target.value === 'personalizado') {
        if (cf) cf.style.display = 'block';
        if (tp) tp.style.display = 'none';
      } else {
        if (cf) cf.style.display = 'none';
        if (tp) tp.style.display = 'block';
      }
    });
  }

  const corte = document.getElementById('llevaCorte');
  if (corte) {
    corte.addEventListener('change', e => {
      const cc = document.getElementById('seccionPiezas');
      if (cc) cc.style.display = e.target.value === 'si' ? 'block' : 'none';
    });
  }

  const tipoComp = document.getElementById('tipoComprobante');
  if (tipoComp) tipoComp.addEventListener('change', actualizarCotizacion);

  const btnLimp = document.getElementById('btnLimpiarCotizacion');
  if (btnLimp) btnLimp.addEventListener('click', limpiarCotizacion);

  const btnGen = document.getElementById('btnGenerarCotizacion'); // Botón pequeño
  if (btnGen) btnGen.addEventListener('click', generarCotizacion);

  const btnWsp = document.getElementById('btnWhatsapp');
  if (btnWsp) btnWsp.addEventListener('click', enviarWhatsApp);

  const btnExp = document.getElementById('btnExportarSistema');
  if (btnExp) btnExp.addEventListener('click', exportarParaSistemaViejo);
  
  // --- EVENTOS LOGIN ---
  const btnAuthNav = document.getElementById('btnAuthNav');
  if (btnAuthNav) btnAuthNav.addEventListener('click', manejarClickAuth);
  document.getElementById('formLogin')?.addEventListener('submit', procesarLogin);
  document.getElementById('btnCerrarLogin')?.addEventListener('click', () => document.getElementById('modalLogin').classList.add('hidden'));

  // Event listeners para el resumen del libro en tiempo real
  const camposLibro = ['libroPaginasBN', 'libroPaginasColor', 'libroPaginasFullColor', 'libroJuegos', 'libroTerminacion'];
  camposLibro.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', actualizarResumenLibro);
      elemento.addEventListener('change', actualizarResumenLibro);
    }
  });

  // --- NUEVOS EVENT LISTENERS PARA GESTIÓN DE COTIZACIONES ---
  const btnGuardar = document.getElementById('btnGuardarCotizacion');
  if (btnGuardar) btnGuardar.addEventListener('click', guardarCotizacionActual);

  const btnCambios = document.getElementById('btnGuardarCambios');
  if (btnCambios) btnCambios.addEventListener('click', guardarCambiosCotizacion);

  const btnVer = document.getElementById('btnVerGuardadas');
  if (btnVer) btnVer.addEventListener('click', abrirModalCotizaciones);

  // --- EVENTO DASHBOARD ---
  const btnDashboard = document.getElementById('btnDashboard');
  if (btnDashboard) btnDashboard.addEventListener('click', abrirModalDashboard);

  const btnCerrarModal = document.getElementById('btnCerrarModal');
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalCotizaciones);

  // Cerrar modal con ESC
  document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('modalCotizacionesGuardadas')?.classList.contains('hidden')) {
          cerrarModalCotizaciones();
      }
  });
  
  const btnCerrarDashboard = document.getElementById('btnCerrarDashboard');
  if (btnCerrarDashboard) btnCerrarDashboard.addEventListener('click', () => {
    document.getElementById('modalDashboard').classList.add('hidden');
  });
  const btnFiltrarDashboard = document.getElementById('btnFiltrarDashboard');
  if (btnFiltrarDashboard) btnFiltrarDashboard.addEventListener('click', cargarDatosDashboard);

  // Cerrar modal al hacer click fuera del contenido
  const modalDash = document.getElementById('modalDashboard');
  if (modalDash) {
    modalDash.addEventListener('click', (e) => {
      if (e.target === modalDash) document.getElementById('modalDashboard').classList.add('hidden');
    });
  }

  // Cerrar modal al hacer click fuera del contenido
  const modal = document.getElementById('modalCotizacionesGuardadas');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModalCotizaciones();
    });
  }

  // --- EVENTOS FACTURACIÓN ---
  const btnBuscarRNC = document.getElementById('btnBuscarRNC');
  if (btnBuscarRNC) btnBuscarRNC.addEventListener('click', buscarClientePorRNC);

  const btnConfirmarFactura = document.getElementById('btnConfirmarFactura');
  if (btnConfirmarFactura) btnConfirmarFactura.addEventListener('click', generarFacturaFinal);

  const btnCancelarFactura = document.getElementById('btnCancelarFactura');
  if (btnCancelarFactura) btnCancelarFactura.addEventListener('click', () => {
    document.getElementById('modalFacturacion').classList.add('hidden');
  });

  // Actualizar preview de secuencia al cambiar tipo
  const selectNCF = document.getElementById('selectTipoNCF');
  if (selectNCF) selectNCF.addEventListener('change', actualizarPreviewNCF);
  
  // Evento de búsqueda en tiempo real
  const inputRNC = document.getElementById('inputRNCFactura');
  if (inputRNC) {
    inputRNC.addEventListener('input', manejarBusquedaCliente);
  }

  // --- EVENTOS HISTORIAL FACTURAS ---
  const btnVerFacturas = document.getElementById('btnVerFacturas');
  if (btnVerFacturas) btnVerFacturas.addEventListener('click', abrirModalFacturas);

  const btnCerrarModalFacturas = document.getElementById('btnCerrarModalFacturas');
  if (btnCerrarModalFacturas) btnCerrarModalFacturas.addEventListener('click', () => document.getElementById('modalFacturasEmitidas').classList.add('hidden'));

  const filtroMes = document.getElementById('filtroMesFacturas');
  if (filtroMes) filtroMes.addEventListener('change', cargarFacturasPorMes);

  const checkAnuladas = document.getElementById('checkOcultarAnuladas');
  if (checkAnuladas) checkAnuladas.addEventListener('change', renderizarFacturas);

  const btnExportar607 = document.getElementById('btnExportar607');
  if (btnExportar607) btnExportar607.addEventListener('click', generarReporte607);

  const btnBackup = document.getElementById('btnBackupFacturas');
  if (btnBackup) btnBackup.addEventListener('click', descargarBackupJSON);

  const btnReporteDiario = document.getElementById('btnReporteDiario');
  if (btnReporteDiario) btnReporteDiario.addEventListener('click', generarReporteDiario);

  const btnIT1Excel = document.getElementById('btnReporteIT1Excel');
  if (btnIT1Excel) btnIT1Excel.addEventListener('click', () => generarReporteIT1('excel'));

  const btnIT1PDF = document.getElementById('btnReporteIT1PDF');
  if (btnIT1PDF) btnIT1PDF.addEventListener('click', () => generarReporteIT1('pdf'));

  // --- EVENTOS MODAL ANULACIÓN SEGURA ---
  const btnEjecutarAnulacion = document.getElementById('btnEjecutarAnulacion');
  if (btnEjecutarAnulacion) btnEjecutarAnulacion.addEventListener('click', procesarAnulacion);

  const btnCancelarAnulacion = document.getElementById('btnCancelarAnulacion');
  if (btnCancelarAnulacion) btnCancelarAnulacion.addEventListener('click', () => {
    document.getElementById('modalConfirmarAnulacion').classList.add('hidden');
    idFacturaAAnular = null;
  });

  const inputAnulacion = document.getElementById('inputConfirmacionAnular');
  if (inputAnulacion) {
    inputAnulacion.addEventListener('input', (e) => {
      const btn = document.getElementById('btnEjecutarAnulacion');
      // Habilitar botón solo si escribe "anular" (sin importar mayúsculas/minúsculas)
      if (btn) btn.disabled = e.target.value.toLowerCase() !== 'anular';
    });
    // Permitir confirmar con Enter
    inputAnulacion.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && e.target.value.toLowerCase() === 'anular') {
        procesarAnulacion();
      }
    });
  }

  // --- EVENTOS MODAL LIMPIAR ---
  const btnEjecutarLimpiar = document.getElementById('btnEjecutarLimpiar');
  if (btnEjecutarLimpiar) btnEjecutarLimpiar.addEventListener('click', ejecutarLimpiarCotizacion);

  const btnCancelarLimpiar = document.getElementById('btnCancelarLimpiar');
  if (btnCancelarLimpiar) btnCancelarLimpiar.addEventListener('click', () => {
    document.getElementById('modalConfirmarLimpiar').classList.add('hidden');
  });

  // --- EVENTOS MODAL ELIMINAR COTIZACIÓN ---
  const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
  if (btnConfirmarEliminar) btnConfirmarEliminar.addEventListener('click', ejecutarEliminacionCotizacion);

  const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
  if (btnCancelarEliminar) btnCancelarEliminar.addEventListener('click', () => {
    document.getElementById('modalConfirmarEliminar').classList.add('hidden');
    idCotizacionAEliminar = null;
  });
}

// ============================================
// 📊 RESUMEN AUTOMÁTICO DEL LIBRO
// ============================================

function actualizarResumenLibro() {
  const bn = parseInt(document.getElementById('libroPaginasBN')?.value || 0);
  const color = parseInt(document.getElementById('libroPaginasColor')?.value || 0);
  const fullColor = parseInt(document.getElementById('libroPaginasFullColor')?.value || 0);
  const juegos = parseInt(document.getElementById('libroJuegos')?.value || 1);
  const terminacion = document.getElementById('libroTerminacion')?.value;
  
  const totalPaginas = bn + color + fullColor;
  
  if (totalPaginas > 0) {
    const resumenDiv = document.getElementById('resumenLibro');
    const contentDiv = document.getElementById('resumenContent');
    
    if (resumenDiv && contentDiv) {
      resumenDiv.style.display = 'block';
      
      let html = `<p><strong>Total de páginas:</strong> ${totalPaginas}</p>`;
      if (bn > 0) html += `<p>• ${bn} páginas B/N</p>`;
      if (color > 0) html += `<p>• ${color} páginas Color</p>`;
      if (fullColor > 0) html += `<p>• ${fullColor} páginas Full Color</p>`;
      
      const termTexto = {
        'ninguna': 'Sin terminación',
        'espiral': 'Con encuadernado espiral',
        'tapa_blanda': 'Con empastado tapa blanda',
        'tapa_dura': 'Con empastado tapa dura'
      };
      
      html += `<p><strong>Terminación:</strong> ${termTexto[terminacion] || 'N/A'}</p>`;
      html += `<p><strong>Copias:</strong> ${juegos} libro(s)</p>`;
      
      contentDiv.innerHTML = html;
    }
  } else {
    const resumenDiv = document.getElementById('resumenLibro');
    if (resumenDiv) resumenDiv.style.display = 'none';
  }
}

// ============================================
// � CÁLCULO DE PRECIOS EN TIEMPO REAL
// ============================================

function calcularPrecioImpresionTiempoReal() {
  const cantidad = parseInt(document.getElementById('cantidadPaginas')?.value || 0);
  const tipo = document.getElementById('tipoImpresion')?.value;
  const tamano = document.getElementById('tamanoImpresion')?.value;
  const precioDiv = document.getElementById('precioImpresion');
  const unitarioSpan = document.getElementById('precioUnitarioImpresion');
  const totalSpan = document.getElementById('precioTotalImpresion');

  if (!cantidad || !tipo || !tamano || cantidad <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const precioUnitario = calcularPrecioImpresion(cantidad, tipo, tamano) / cantidad;
  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioEncuadernadoTiempoReal() {
  const paginas = parseInt(document.getElementById('paginasEncuadernado')?.value || 0);
  const cantidad = parseInt(document.getElementById('cantidadEncuadernado')?.value || 1);
  const precioDiv = document.getElementById('precioEncuadernado');
  const unitarioSpan = document.getElementById('precioUnitarioEncuadernado');
  const totalSpan = document.getElementById('precioTotalEncuadernado');

  if (!paginas || paginas <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const precioUnitario = calcularPrecioEncuadernado(paginas);
  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioEmpastadoTiempoReal() {
  const tipoRaw = document.getElementById('tipoEmpastadoGeneral')?.value;
  const tamano = document.getElementById('tamanoEmpastado')?.value;
  const cantidad = parseInt(document.getElementById('cantidadEmpastado')?.value || 1);
  const precioDiv = document.getElementById('precioEmpastado');
  const unitarioSpan = document.getElementById('precioUnitarioEmpastado');
  const totalSpan = document.getElementById('precioTotalEmpastado');

  if (!tipoRaw || !tamano) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const tipoMap = { tapa_dura: 'Tapa Dura', tapa_blanda: 'Tapa Blanda' };
  const tipo = tipoMap[tipoRaw];
  const precioUnitario = calcularPrecioEmpastado(tipo, tamano);
  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioPloteoTiempoReal() {
  const tipo = document.getElementById('tipoPloteo')?.value;
  const opcionTamano = document.getElementById('opcionTamanoPloteo')?.value;
  const tamano = document.getElementById('tamanoPloteo')?.value;
  const cantidad = parseInt(document.getElementById('cantidadPloteo')?.value || 1);
  const ancho = parseFloat(document.getElementById('anchoPloteo')?.value || 0);
  const alto = parseFloat(document.getElementById('altoPloteo')?.value || 0);
  const precioDiv = document.getElementById('precioPloteo');
  const unitarioSpan = document.getElementById('precioUnitarioPloteo');
  const totalSpan = document.getElementById('precioTotalPloteo');

  if (!tipo || !opcionTamano || cantidad <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  let precioUnitario = 0;
  if (opcionTamano === 'personalizado' && ancho > 0 && alto > 0) {
    precioUnitario = calcularPrecioPloteo(tipo, 'custom', 1, ancho, alto);
  } else if (tamano) {
    precioUnitario = calcularPrecioPloteo(tipo, tamano, 1);
  }

  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioPlastificadoTiempoReal() {
  const tamano = document.getElementById('tamanoPlastificado')?.value;
  const llevaCorte = document.getElementById('llevaCorte')?.value === 'si';
  const cantidadHojas = parseInt(document.getElementById('cantidadPlastificado')?.value || 1);
  const piezasPorHoja = llevaCorte ? parseInt(document.getElementById('cantidadPiezas')?.value || 1) : 1;
  const precioDiv = document.getElementById('precioPlastificado');
  const unitarioSpan = document.getElementById('precioUnitarioPlastificado');
  const totalSpan = document.getElementById('precioTotalPlastificado');

  if (!tamano || cantidadHojas <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const precioTotal = calcularPrecioPlastificado(tamano, llevaCorte, cantidadHojas, piezasPorHoja);
  const precioUnitario = llevaCorte ? precioTotal / (cantidadHojas * piezasPorHoja) : precioTotal / cantidadHojas;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioPersonalizadoTiempoReal() {
  const cant = parseInt(document.getElementById('cantPersonalizado')?.value || 0);
  const precio = parseFloat(document.getElementById('precioPersonalizado')?.value || 0);
  const div = document.getElementById('resumenPersonalizado');
  const totalSpan = document.getElementById('totalPersonalizado');

  if (cant > 0 && precio > 0) {
    if (div) div.style.display = 'block';
    if (totalSpan) totalSpan.textContent = `RD$${(cant * precio).toFixed(2)}`;
  } else {
    if (div) div.style.display = 'none';
  }
}

// ============================================
// 🎯 EVENT LISTENERS PARA PRECIOS EN TIEMPO REAL
// ============================================

function inicializarPrecioTiempoReal() {
  // Impresión
  const camposImpresion = ['cantidadPaginas', 'tipoImpresion', 'tamanoImpresion'];
  camposImpresion.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioImpresionTiempoReal);
      elemento.addEventListener('change', calcularPrecioImpresionTiempoReal);
    }
  });

  // Encuadernado
  const camposEncuadernado = ['paginasEncuadernado', 'cantidadEncuadernado'];
  camposEncuadernado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioEncuadernadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioEncuadernadoTiempoReal);
    }
  });

  // Empastado
  const camposEmpastado = ['tipoEmpastadoGeneral', 'tamanoEmpastado', 'cantidadEmpastado'];
  camposEmpastado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioEmpastadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioEmpastadoTiempoReal);
    }
  });

  // Ploteo
  const camposPloteo = ['tipoPloteo', 'opcionTamanoPloteo', 'tamanoPloteo', 'cantidadPloteo', 'anchoPloteo', 'altoPloteo'];
  camposPloteo.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioPloteoTiempoReal);
      elemento.addEventListener('change', calcularPrecioPloteoTiempoReal);
    }
  });

  // Plastificado
  const camposPlastificado = ['tamanoPlastificado', 'llevaCorte', 'cantidadPlastificado', 'cantidadPiezas'];
  camposPlastificado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioPlastificadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioPlastificadoTiempoReal);
    }
  });

  // Personalizado
  const camposPersonalizado = ['cantPersonalizado', 'precioPersonalizado'];
  camposPersonalizado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioPersonalizadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioPersonalizadoTiempoReal);
    }
  });
}

// ============================================
// 🖨️ IMPRIMIR COTIZACIÓN (vista para imprimir)
// ============================================

async function imprimirCotizacion() {
  if (isGeneratingPDF) {
    mostrarNotificacion('Ya se está generando un PDF, por favor espere.', 'warning');
    return;
  }
  if (cotizacion.length === 0) {
    mostrarNotificacion('Cotización vacía', 'warning');
    return;
  }

  isGeneratingPDF = true;
  const btn = document.getElementById('generarPDF');
  let originalBtnHTML = '';
  if (btn) {
    originalBtnHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="text-2xl animate-spin">⚙️</span> Generando PDF...`;
  }

  const originalTable = document.getElementById('cotizacionTabla');
  if (!originalTable) { mostrarNotificacion('No se encontró la tabla', 'error'); return; }

  if (!originalTable) {
    mostrarNotificacion('No se encontró la tabla', 'error');
    return;
  }
  const tableClone = originalTable.cloneNode(true);
  tableClone.querySelectorAll('tr').forEach(row => {
    row.querySelectorAll('button, input, select').forEach(n => n.remove());
    const cells = row.querySelectorAll('th, td');
    if (cells.length > 0) cells[cells.length - 1].remove();
  });

  const fecha = new Date().toLocaleString();
  const tipoComp = document.getElementById('tipoComprobante')?.value || 'ninguno';
  const subtotal = cotizacion.reduce((s, i) => s + i.precio, 0);
  

  let impuesto = 0;
  let nombreImpuesto = '';
  if (tipoComp === 'fiscal') { impuesto = subtotal * 0.18; nombreImpuesto = 'ITBIS (18%)'; }
  else if (tipoComp === 'gubernamental') { impuesto = subtotal * 0.10; nombreImpuesto = 'ISR (10%)'; }


  const total = subtotal + impuesto;

  // Preparamos los textos para asegurar compatibilidad
  const descripcionTexto = cotizacion.map(i => `${i.cantidad || 1}x ${i.nombre} ${i.descripcion ? '(' + i.descripcion + ')' : ''}`).join('\n');

  const resumenHTML = tipoComp !== 'ninguno' ? `
    <tr style="background-color: #f0f9ff;">
      <td colspan="4" style="text-align: right; font-weight: bold; color: #475569; padding: 12px 16px;">Subtotal:</td>
      <td style="text-align: right; font-weight: bold; color: #2563eb; padding: 12px 16px; font-size: 16px;">RD$${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right; font-weight: bold; color: #475569; padding: 12px 16px;">Impuesto (${nombreImpuesto}):</td>
      <td style="text-align: right; font-weight: bold; color: #ea580c; padding: 12px 16px; font-size: 16px;">RD$${impuesto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
    </tr>
    <tr style="background: linear-gradient(to right, #2563eb, #1e40af);">
      <td colspan="4" style="text-align: right; font-weight: bold; color: white; padding: 16px; font-size: 14px;">TOTAL A PAGAR:</td>
      <td style="text-align: right; font-weight: 900; color: white; padding: 16px; font-size: 18px; background: linear-gradient(to right, #ea580c, #c2410c);">RD$${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
    </tr>
  ` : `
    <tr style="background: linear-gradient(to right, #2563eb, #1e40af);">
      <td colspan="4" style="text-align: right; font-weight: bold; color: white; padding: 16px; font-size: 14px;">TOTAL:</td>
      <td style="text-align: right; font-weight: 900; color: white; padding: 16px; font-size: 18px; background: linear-gradient(to right, #ea580c, #c2410c);">RD$${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
    </tr>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <base href="${window.location.origin}/">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización - ServiGaco</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: white; }
        .container { max-width: 900px; margin: 0 auto; background: white; overflow: hidden; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 50%, #1e3a8a 100%); color: white; padding: 40px 30px; position: relative; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header::before { content: ''; position: absolute; top: -50%; right: -50%; width: 400px; height: 400px; background: rgba(234, 88, 12, 0.15); border-radius: 50%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header::after { content: ''; position: absolute; bottom: -30%; left: -30%; width: 300px; height: 300px; background: rgba(234, 88, 12, 0.1); border-radius: 50%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header-content { position: relative; z-index: 1; text-align: center; }
        .logo { width: 140px; height: auto; margin: 0 auto 15px; display: block; }
        .header h1 { font-size: 28px; font-weight: 900; margin-bottom: 5px; letter-spacing: -0.5px; }
        .header-divider { width: 50px; height: 4px; background: linear-gradient(to right, #f97316, #ea580c); margin: 10px auto 15px; border-radius: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header p { font-size: 12px; color: #bfdbfe; font-weight: 600; letter-spacing: 1px; margin-bottom: 15px; }
        .header-badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 12px 20px; font-size: 12px; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .content { padding: 30px; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: linear-gradient(to right, #2563eb, #1e40af); color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        thead th { padding: 14px 16px; text-align: left; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        tbody tr { border-bottom: 1px solid #e0e7ff; }
        tbody tr:nth-child(odd) { background: #f0f9ff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        tbody tr:nth-child(even) { background: white; }
        tbody td { padding: 14px 16px; font-size: 13px; }
        tbody td:first-child { font-weight: 700; color: #1e3a8a; }
        tbody td:nth-child(3) { text-align: center; font-weight: 600; }
        tbody td:nth-child(4), tbody td:nth-child(5) { text-align: right; }
        tbody td:nth-child(4) { color: #2563eb; font-weight: 600; }
        tbody td:nth-child(5) { color: #ea580c; font-weight: 700; }
        .footer { background: linear-gradient(to right, #1f2937, #111827); border-top: 4px solid #ea580c; padding: 25px 30px; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .footer-brand { color: #f97316; font-weight: 900; font-size: 16px; letter-spacing: 1px; margin-bottom: 5px; }
        .footer-subtitle { color: #cbd5e1; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
        .footer-text { color: #94a3b8; font-size: 11px; line-height: 1.6; border-top: 1px solid #374151; padding-top: 12px; margin-top: 12px; }
        @page { size: 8.5in 11in; margin: 0.3in; }
        @media print {
          html, body { width: 8.5in; height: 11in; margin: 0; padding: 0; overflow: hidden; }
          body { background: white; }
          .container { box-shadow: none; border-radius: 0; max-height: 100%; overflow: hidden; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { padding: 25px 20px; }
          .header h1 { font-size: 24px; }
          .header p { font-size: 10px; }
          .content { padding: 15px; }
          table { font-size: 11px; }
          thead th { padding: 10px 12px; font-size: 10px; }
          tbody td { padding: 8px 12px; font-size: 10px; }
          .footer { padding: 15px 20px; font-size: 9px; }
          .footer-brand { font-size: 13px; }
          .footer-subtitle { font-size: 9px; }
          .footer-text { font-size: 9px; }
          .logo { width: 100px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- HEADER -->
        <div class="header">
          <div class="header-content">
            <img src="logo.png" alt="Servigaco Logo" class="logo" />
            <img src="assets/logo.png" alt="Servigaco Logo" class="logo" />
            <div class="header-divider"></div>
            <p>COTIZACIÓN DE SERVICIOS PROFESIONALES</p>
            <div class="header-badge">
              📅 ${fecha} | ✓ Presupuesto Válido
            </div>
          </div>
        </div>

        <!-- CONTENIDO -->
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Descripción</th>
                <th style="width: 80px; text-align: center;">Cantidad</th>
                <th style="width: 110px; text-align: right;">Precio Unit.</th>
                <th style="width: 110px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from(tableClone.querySelectorAll('tbody tr')).map((row, idx) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                  return '<tr>' +
                    '<td>' + cells[0].textContent.trim() + '</td>' +
                    '<td>' + cells[1].textContent.trim() + '</td>' +
                    '<td style="text-align: center;">' + cells[2].textContent.trim() + '</td>' +
                    '<td style="text-align: right;">' + cells[3].textContent.trim() + '</td>' +
                    '<td style="text-align: right;">' + cells[4].textContent.trim() + '</td>' +
                  '</tr>';
                }
                return '';
              }).join('')}
            </tbody>
            <tfoot>
              ${resumenHTML}
            </tfoot>
          </table>
        </div>

        <!-- FOOTER -->
        <div class="footer">
          <div class="footer-brand">ServiGaco®</div>
          <div class="footer-subtitle">SERVICIOS DE IMPRESIÓN PROFESIONALES</div>
          <div class="footer-text">
            Cotización generada automáticamente. Válida por 30 días.<br>
            Para confirmar el pedido, contacta con nuestro equipo de ventas.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', 'cotizacion', 'width=1200,height=800');
  ventana.document.write(html);
  ventana.document.close();
  setTimeout(() => {
    ventana.print();
  }, 500);
  try {
    const filename = `cotizacion-general-${new Date().getTime()}.pdf`;
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
        throw new Error(`Error ${response.status}: El endpoint /generar-pdf no existe.\n\n⚠️ Asegúrate de ejecutar 'node server.js'.`);
      }
    }

    const pdfBlob = await response.blob();
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    // Guardar reporte de venta en Firebase
    registrarLogVenta({
      tipo: 'General',
      total: total.toFixed(2),
      detalle: descripcionTexto
    });
  } catch (error) {
    console.error('Error al generar PDF desde backend:', error);
    mostrarNotificacion(error.message || 'Error al generar el PDF', 'error');
  } finally {
    isGeneratingPDF = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHTML;
    }
  }
}

// ============================================
// 💾 PERSISTENCIA (LOCALSTORAGE)
// ============================================

function guardarEnLocalStorage() {
  localStorage.setItem('cotizacion_servigaco', JSON.stringify(cotizacion));
  // Guardamos también el ID para no perder la referencia si se recarga la página
  if (idCotizacionActiva) localStorage.setItem('cotizacion_servigaco_id', idCotizacionActiva);
  if (nombreCotizacionActiva) localStorage.setItem('cotizacion_servigaco_nombre', nombreCotizacionActiva);
}

function cargarDeLocalStorage() {
  const guardado = localStorage.getItem('cotizacion_servigaco');
  if (guardado) {
    try {
      cotizacion = JSON.parse(guardado);
      actualizarCotizacion();
    } catch (e) {
      console.error('Error cargando cotización guardada', e);
    }
  }
  // Recuperar el ID si existe
  const idGuardado = localStorage.getItem('cotizacion_servigaco_id');
  if (idGuardado) {
    idCotizacionActiva = idGuardado;
  }
  const nombreGuardado = localStorage.getItem('cotizacion_servigaco_nombre');
  if (nombreGuardado) {
    nombreCotizacionActiva = nombreGuardado;
  }
  if (idGuardado || nombreGuardado) actualizarCotizacion();
}

// ============================================
// ☁️ GESTIÓN CON FIREBASE REALTIME DATABASE
// ============================================

async function guardarCotizacionActual() { // ESTA FUNCIÓN AHORA SOLO CREA NUEVAS
  // 1. Validar que haya items
  if (cotizacion.length === 0) {
    mostrarNotificacion("⚠️ La cotización está vacía. Agrega servicios primero.", "warning");
    return;
  }

  // 2. Usar el nombre activo o uno por defecto (SIN PREGUNTAR NADA)
  const nombre = nombreCotizacionActiva || "Cliente General";

  // 3. Calcular Totales
  const subtotal = cotizacion.reduce((sum, item) => sum + item.precio, 0);
  const tipoComp = document.getElementById('tipoComprobante')?.value || 'ninguno';
  let impuesto = 0;
  if (tipoComp === 'fiscal') impuesto = subtotal * 0.18;
  else if (tipoComp === 'gubernamental') impuesto = subtotal * 0.10;
  const total = subtotal + impuesto;

  // 4. Generar Descripción Detallada (SOLUCIÓN "NO LOS DETALLES")
  // Crea un texto como: "50x Impresión B/N, 2x Encuadernado Espiral"
  const detallesTexto = cotizacion.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');
  const descripcionFinal = detallesTexto.length > 100 ? detallesTexto.substring(0, 97) + '...' : detallesTexto;

  // 5. Construir Objeto
  const paqueteDeDatos = {
    fecha: new Date().toISOString(),
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    tipo: "General",
    nombre: nombre,
    total: total.toFixed(2),
    descripcion: descripcionFinal, // Ahora guarda los detalles reales
    items: cotizacion
  };

  console.log("🚀 Enviando General a Firebase:", paqueteDeDatos);

  // 6. Enviar
  try {
    // CREAMOS un registro nuevo siempre
    const newRef = await db.ref("cotizaciones").push(paqueteDeDatos);
    idCotizacionActiva = newRef.key; // Pasamos a modo edición de la nueva cotización
    nombreCotizacionActiva = nombre;
    guardarEnLocalStorage(); // Guardamos el nuevo ID inmediatamente
    actualizarCotizacion(); // Actualiza la UI (esto ocultará "Guardar" y mostrará "Guardar Cambios")
    mostrarNotificacion(`✅ Cotización guardada`, "success");
  } catch (error) {
    console.error("❌ Error:", error);
    mostrarNotificacion("Error al guardar: " + error.message, "error");
  }
}

async function guardarCambiosCotizacion() { // NUEVA FUNCIÓN SOLO PARA EDITAR
  if (!idCotizacionActiva) {
    mostrarNotificacion("⚠️ No hay una cotización activa para editar.", "error");
    return;
  }

  const nombre = nombreCotizacionActiva || "Cliente General";
  const subtotal = cotizacion.reduce((sum, item) => sum + item.precio, 0);
  const tipoComp = document.getElementById('tipoComprobante')?.value || 'ninguno';
  let impuesto = 0;
  if (tipoComp === 'fiscal') impuesto = subtotal * 0.18;
  else if (tipoComp === 'gubernamental') impuesto = subtotal * 0.10;
  const total = subtotal + impuesto;

  const detallesTexto = cotizacion.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');
  const descripcionFinal = detallesTexto.length > 100 ? detallesTexto.substring(0, 97) + '...' : detallesTexto;

  const paqueteDeDatos = {
    fecha: new Date().toISOString(), // Actualizamos fecha de modificación
    // No sobrescribimos timestamp original si no queremos, o usamos uno de 'updatedAt'
    tipo: "General",
    nombre: nombre,
    total: total.toFixed(2),
    descripcion: descripcionFinal,
    items: cotizacion
  };

  try {
    await db.ref("cotizaciones").child(idCotizacionActiva).update(paqueteDeDatos);
    mostrarNotificacion(`✅ Cambios guardados correctamente`, "success");
  } catch (error) {
    console.error("❌ Error actualizando:", error);
    mostrarNotificacion("Error al actualizar: " + error.message, "error");
  }
}

function cargarCotizacionGuardada(id) {
  const cotizacionGuardada = todasLasCotizaciones.find(c => c.id === id);
  if (cotizacionGuardada) {
    idCotizacionActiva = id;
    nombreCotizacionActiva = cotizacionGuardada.nombre || "Cliente General";
    // Asegurar que items sea un array (Firebase puede devolver objeto si las claves son numéricas pero discontinuas, aunque push usa array)
    cotizacion = cotizacionGuardada.items ? Object.values(cotizacionGuardada.items) : [];
    actualizarCotizacion();
    cerrarModalCotizaciones();
    mostrarNotificacion(`Cotización "${cotizacionGuardada.nombre}" cargada para edición`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    mostrarNotificacion('Error: No se pudo encontrar la cotización seleccionada', 'error');
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
  document.getElementById('modalConfirmarEliminar').classList.add('hidden');
  idCotizacionAEliminar = null;

  try {
    await db.ref("cotizaciones").child(id).remove();
    todasLasCotizaciones = todasLasCotizaciones.filter(c => c.id !== id);
    renderizarCotizacionesGuardadas();
    mostrarNotificacion('Cotización eliminada', 'success');
    if (idCotizacionActiva === id) limpiarCotizacion();
  } catch (error) {
    console.error("Error eliminando:", error);
    mostrarNotificacion('Error al eliminar.', 'error');
  }
}

function renderizarCotizacionesGuardadas() {
  const container = document.getElementById('listaCotizacionesGuardadas');
  if (!container) return;

  if (!todasLasCotizaciones) {
    container.innerHTML = `<p class="text-center text-gray-500 py-8">Cargando...</p>`;
    return;
  }

  if (todasLasCotizaciones.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">No hay cotizaciones guardadas.</p>`;
    return;
  }

  container.innerHTML = todasLasCotizaciones.map(c => {
    // Manejo robusto de fechas (Firebase Timestamp o String ISO)
    let fechaObj = new Date();
    if (c.timestamp && c.timestamp.toDate) {
      fechaObj = c.timestamp.toDate();
    } else if (c.fecha) {
      fechaObj = new Date(c.fecha);
    }
    
    const fechaStr = fechaObj.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const total = Number(c.total || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Diferenciar visualmente entre Tesis y General
    const esTesis = c.tipo === 'Tesis';
    const icono = esTesis ? '🎓' : '📄';
    const descripcion = esTesis 
      ? `Tesis: ${c.descripcion || 'Sin detalle'}` 
      : `${c.items ? c.items.length : 0} servicio(s)`;
    
    // Botón de facturar (habilitado para General y Tesis)
    const btnFacturar = (!c.ncf) 
      ? `<button onclick="abrirModalFacturacion('${c.id}')" class="flex-1 md:flex-none min-w-[100px] py-2 px-3 rounded-lg font-semibold text-sm text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm whitespace-nowrap">🧾 Facturar</button>`
      : (c.ncf ? `<span class="text-xs font-bold text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded whitespace-nowrap">✅ ${c.ncf}</span>` : '');

    return `
      <div class="p-4 mb-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-blue-50 dark:hover:bg-gray-700/60 transition-colors">
        <div class="flex-grow w-full md:w-auto">
          <p class="font-bold text-lg text-blue-700 dark:text-blue-400 break-words">${icono} ${c.nombre}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Guardada el ${fechaStr} - ${descripcion}</p>
          <p class="text-md font-semibold text-gray-800 dark:text-gray-200 mt-1">Total: RD$${total}</p>
        </div>
        <div class="flex flex-wrap gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
          ${btnFacturar}
          ${!esTesis ? `<button onclick="cargarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none min-w-[90px] py-2 px-3 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm whitespace-nowrap">📝 Editar</button>` : ''}
          <button onclick="eliminarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none min-w-[90px] py-2 px-3 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm whitespace-nowrap">🗑️ Borrar</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// 🧾 LÓGICA DE FACTURACIÓN Y RNC
// ============================================

function validarRNC(str) {
  // Algoritmo oficial DGII (Módulo 10)
  str = str.replace(/-/g, '').trim();
  if (![9, 11].includes(str.length)) return false;

  let total = 0;
  let multiplicadores;

  if (str.length === 9) {
      // RNC Empresas
      multiplicadores = [7, 9, 8, 6, 5, 4, 3, 2];
  } else {
      // Cédula Personas
      multiplicadores = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  }

  for (let i = 0; i < multiplicadores.length; i++) {
      let calculo = parseInt(str.charAt(i)) * multiplicadores[i];
      if (str.length === 11 && calculo >= 10) {
          let sum = calculo.toString().split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
          total += sum;
      } else {
          total += calculo;
      }
  }

  let digitoVerificador;
  if (str.length === 9) {
      let resto = total % 11;
      digitoVerificador = resto === 0 ? 2 : (resto === 1 ? 1 : 11 - resto);
  } else {
      let resto = total % 10;
      digitoVerificador = resto === 0 ? 0 : 10 - resto;
  }

  return parseInt(str.charAt(str.length - 1)) === digitoVerificador;
}

// ============================================
// 🔍 BÚSQUEDA PREDICTIVA DE CLIENTES
// ============================================

function manejarBusquedaCliente(e) {
  const termino = e.target.value.trim();
  const lista = document.getElementById('listaResultadosClientes');
  
  // Limpiar timer anterior
  clearTimeout(searchDebounceTimer);

  // OPTIMIZACIÓN: Exigir más caracteres para texto (4) que para números (3)
  const esNumero = /^\d+$/.test(termino);
  const minChars = esNumero ? 3 : 4; // Aumentado a 4 para texto para evitar congelamientos

  if (termino.length < minChars) {
    lista.classList.add('hidden');
    return;
  }

  // OPTIMIZACIÓN: Ajustado a 450ms para evitar que se congele al escribir rápido
  searchDebounceTimer = setTimeout(() => {
    ejecutarBusquedaFirebase(termino);
  }, 450);
}

// ============================================
// 💾 CACHÉ OFFLINE DE CLIENTES
// ============================================
function guardarEnCacheClientes(resultados) {
  if (!resultados) return;
  try {
    let cache = JSON.parse(localStorage.getItem('clientes_offline_cache') || '{}');
    Object.assign(cache, resultados);
    // Limitar a 500 recientes para no saturar la memoria
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      const keysToKeep = keys.slice(keys.length - 500);
      const newCache = {};
      keysToKeep.forEach(k => newCache[k] = cache[k]);
      cache = newCache;
    }
    localStorage.setItem('clientes_offline_cache', JSON.stringify(cache));
  } catch (e) { console.warn('Cache full', e); }
}

function buscarEnCacheLocal(termino) {
  try {
    const cache = JSON.parse(localStorage.getItem('clientes_offline_cache') || '{}');
    const resultados = {};
    const esNumero = /^\d+$/.test(termino);
    const terminoNorm = termino.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    let count = 0;
    for (const [rnc, data] of Object.entries(cache)) {
      if (count >= 5) break;
      const nombre = (data.n || data.nombre || '').toUpperCase();
      if ((esNumero && rnc.includes(termino)) || (!esNumero && nombre.includes(terminoNorm))) {
        resultados[rnc] = data;
        count++;
      }
    }
    return Object.keys(resultados).length > 0 ? resultados : null;
  } catch (e) { return null; }
}

async function ejecutarBusquedaFirebase(termino) {
  const lista = document.getElementById('listaResultadosClientes');
  // MEJORA VISUAL: Spinner de carga animado
  lista.innerHTML = `
    <div class="p-6 flex flex-col items-center justify-center text-blue-600">
      <svg class="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="font-bold text-sm animate-pulse">Buscando clientes...</span>
    </div>
  `;
  lista.classList.remove('hidden');

  // 1. INTENTO OFFLINE INMEDIATO
  if (!navigator.onLine) {
    const resultadosLocal = buscarEnCacheLocal(termino);
    renderizarResultadosBusqueda(resultadosLocal, termino, true);
    return;
  }

  const esNumero = /^\d+$/.test(termino);
  let query;

  try {
    if (esNumero) {
      // Buscar por RNC (Clave primaria)
      // OPTIMIZACIÓN: Límite bajado a 5 para mayor velocidad
      query = db.ref('maestro_contribuyentes').orderByKey().startAt(termino).endAt(termino + "\uf8ff").limitToFirst(5);
    } else {
      // Buscar por Nombre (Propiedad 'n')
      // Normalizamos: Quitamos acentos y pasamos a mayúsculas (ej: "Café" -> "CAFE")
      const terminoNorm = termino.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      query = db.ref('maestro_contribuyentes').orderByChild('n').startAt(terminoNorm).endAt(terminoNorm + "\uf8ff").limitToFirst(5);
    }

    const snapshot = await query.once('value');
    const resultados = snapshot.val();

    // 2. GUARDAR EN CACHÉ SI HAY ÉXITO
    if (resultados) {
      guardarEnCacheClientes(resultados);
    }

    renderizarResultadosBusqueda(resultados, termino, false);

  } catch (error) {
    console.error("Error búsqueda:", error);
    // 3. FALLBACK A CACHÉ SI FALLA LA RED
    const resultadosLocal = buscarEnCacheLocal(termino);
    if (resultadosLocal) {
      renderizarResultadosBusqueda(resultadosLocal, termino, true);
    } else {
      lista.innerHTML = '<div class="p-3 text-center text-red-500 text-xs">Error de conexión y sin datos locales</div>';
    }
  }
}

function renderizarResultadosBusqueda(resultados, termino, esOffline) {
  const lista = document.getElementById('listaResultadosClientes');
  if (!resultados) {
    lista.innerHTML = '<div class="p-3 text-center text-gray-500">No se encontraron resultados</div>';
    return;
  }
  const badge = esOffline ? '<span class="text-[10px] bg-gray-200 text-gray-600 px-1 rounded ml-2">📡 Offline</span>' : '';
  const safeTerm = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const html = Object.keys(resultados).map(key => {
    const datos = resultados[key];
    const nombre = datos.n || datos.nombre;
    const nombreResaltado = nombre.replace(new RegExp(`(${safeTerm})`, 'gi'), '<span class="bg-yellow-200 text-black">$1</span>');
    return `
      <div class="p-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors" onclick="seleccionarClienteBusqueda('${key}', '${nombre.replace(/'/g, "\\'")}')">
        <div class="flex justify-between items-start">
          <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${nombreResaltado}</p>
          ${badge}
        </div>
        <p class="text-xs text-gray-500 font-mono">RNC: ${key}</p>
      </div>
    `;
  }).join('');
  lista.innerHTML = html;
}

// Función global para el onclick del HTML generado
window.seleccionarClienteBusqueda = function(rnc, nombre) {
  document.getElementById('inputRNCFactura').value = rnc;
  document.getElementById('inputNombreFactura').value = nombre;
  document.getElementById('listaResultadosClientes').classList.add('hidden');
  
  // Validar RNC visualmente
  const infoLabel = document.getElementById('infoClienteRNC');
  infoLabel.textContent = '✅ Cliente seleccionado';
  infoLabel.classList.remove('hidden');
  
  // Auto-seleccionar tipo NCF
  const selectNCF = document.getElementById('selectTipoNCF');
  if (rnc.length === 9) selectNCF.value = 'B01';
  else selectNCF.value = 'B02';
};

async function buscarClientePorRNC() {
  const rncInput = document.getElementById('inputRNCFactura');
  const nombreInput = document.getElementById('inputNombreFactura');
  const infoLabel = document.getElementById('infoClienteRNC');
  const selectNCF = document.getElementById('selectTipoNCF');
  
  const rnc = rncInput.value.replace(/-/g, '').trim();

  if (!validarRNC(rnc)) {
    mostrarNotificacion('RNC o Cédula inválido', 'error');
    infoLabel.classList.add('hidden');
    return;
  }

  mostrarNotificacion('Buscando en base de datos...', 'info');

  try {
    // Buscar en el nodo maestro_contribuyentes (que subiste con el script)
    const snapshot = await db.ref('maestro_contribuyentes/' + rnc).once('value');
    const datos = snapshot.val();

    if (datos) {
      nombreInput.value = datos.n || datos.nombre; // 'n' si usaste el script optimizado
      infoLabel.textContent = '✅ Cliente encontrado en DGII';
      infoLabel.classList.remove('hidden');
      
      // Sugerir NCF
      if (rnc.length === 9) {
        selectNCF.value = 'B01'; // Empresa -> Crédito Fiscal
      } else {
        selectNCF.value = 'B02'; // Persona -> Consumo Final
      }
    } else {
      mostrarNotificacion('RNC válido pero no registrado en local. Ingrese nombre manual.', 'warning');
      // MODIFICADO: Botón para guardar cliente nuevo
      infoLabel.innerHTML = `
        <span class="text-yellow-600 font-bold">⚠️ Nuevo Cliente</span>
        <button onclick="guardarNuevoCliente()" type="button" class="ml-3 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded border border-blue-200 transition-colors font-bold shadow-sm">
          💾 Guardar en BD
        </button>
      `;
      infoLabel.classList.remove('hidden');
      nombreInput.focus();
    }
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error de conexión', 'error');
  }
}

async function guardarNuevoCliente() {
  const rncInput = document.getElementById('inputRNCFactura');
  const nombreInput = document.getElementById('inputNombreFactura');
  const infoLabel = document.getElementById('infoClienteRNC');

  const rnc = rncInput.value.replace(/-/g, '').trim();
  const nombre = nombreInput.value.trim();

  if (!validarRNC(rnc)) {
    mostrarNotificacion('RNC inválido', 'error');
    return;
  }

  if (!nombre) {
    mostrarNotificacion('Ingrese el nombre del cliente para guardarlo', 'warning');
    nombreInput.focus();
    return;
  }

  // Feedback visual
  const btn = infoLabel.querySelector('button');
  if(btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Guardando...';
  }

  try {
    // Normalizar nombre para búsqueda (igual que en upload_rnc.js)
    const nombreNormalizado = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    
    await db.ref('maestro_contribuyentes/' + rnc).set({
      n: nombreNormalizado,
      nombre: nombre 
    });

    mostrarNotificacion('✅ Cliente agregado a la base de datos', 'success');
    infoLabel.innerHTML = '<span class="text-green-600 font-bold">✅ Cliente registrado exitosamente</span>';
    
    // Auto-seleccionar tipo NCF si no estaba seleccionado
    const selectNCF = document.getElementById('selectTipoNCF');
    if (selectNCF && !selectNCF.value) {
        if (rnc.length === 9) selectNCF.value = 'B01';
        else selectNCF.value = 'B02';
    }
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
    if(btn) {
        btn.disabled = false;
        btn.textContent = '💾 Guardar en BD';
    }
  }
}

// ============================================
// 🔢 CONTROL DE SECUENCIA NCF
// ============================================

async function actualizarPreviewNCF() {
  const tipo = document.getElementById('selectTipoNCF').value;
  const label = document.getElementById('previewProximoNCF');
  if (!label) return;

  label.textContent = '🔄 Verificando secuencia...';
  label.className = 'text-xs font-bold mt-2 text-right text-gray-500';
  
  try {
    // Consultar solo el contador actual para ser rápidos
    const snap = await db.ref(`secuencias_ncf/${tipo}/actual`).once('value');
    const actual = snap.val() || 0;
    const siguiente = actual + 1;
    const ncfPreview = tipo + String(siguiente).padStart(8, '0');
    
    label.textContent = `Próximo NCF a emitir: ${ncfPreview}`;
    label.className = 'text-xs font-bold mt-2 text-right text-blue-600';
    
  } catch (e) {
    console.error(e);
    label.textContent = '⚠️ Error al consultar secuencia';
    label.className = 'text-xs font-bold mt-2 text-right text-red-500';
  }
}

function abrirModalFacturacion(idCotizacion) {
  // 🛡️ VERIFICACIÓN DE SEGURIDAD
  if (!verificarPermisoAdmin()) return;

  cotizacionAFacturar = todasLasCotizaciones.find(c => c.id === idCotizacion);
  
  if (!cotizacionAFacturar) return;

  // Pre-llenar datos
  document.getElementById('montoTotalFactura').textContent = `RD$${cotizacionAFacturar.total}`;
  document.getElementById('inputNombreFactura').value = cotizacionAFacturar.nombre;
  document.getElementById('inputRNCFactura').value = '';
  document.getElementById('infoClienteRNC').classList.add('hidden');
  document.getElementById('listaResultadosClientes').classList.add('hidden'); // Ocultar lista si estaba abierta
  
  // Mostrar modal
  document.getElementById('modalFacturacion').classList.remove('hidden');
  cerrarModalCotizaciones(); // Cerrar el de lista
  actualizarPreviewNCF(); // Cargar secuencia inicial
}

function validarFormatoNCF(ncf) {
  // Formato DGII: B + 2 dígitos tipo + 8 dígitos secuencia = 11 caracteres
  // Ej: B0100000001
  const regex = /^B(01|02|04|14|15)\d{8}$/;
  return regex.test(ncf);
}

async function generarFacturaFinal() {
  if (!cotizacionAFacturar) return;

  const rnc = document.getElementById('inputRNCFactura').value;
  const nombre = document.getElementById('inputNombreFactura').value;
  const tipoNCF = document.getElementById('selectTipoNCF').value;

  if (!nombre) {
    mostrarNotificacion('El nombre es obligatorio', 'error');
    return;
  }

  // Si es B01, RNC es obligatorio
  if (tipoNCF === 'B01' && !validarRNC(rnc)) {
    mostrarNotificacion('Para Crédito Fiscal (B01) se requiere un RNC válido', 'error');
    return;
  }

  mostrarNotificacion('Generando NCF...', 'info');

  try {
    // 1. Obtener secuencia de NCF (Transacción atómica para evitar duplicados)
    const secuenciaRef = db.ref(`secuencias_ncf/${tipoNCF}`);
    const result = await secuenciaRef.transaction((currentData) => {
      if (currentData === null) return { actual: 1 }; // Si no existe, empieza en 1
      return { ...currentData, actual: (currentData.actual || 0) + 1 };
    });

    const numeroSecuencia = result.snapshot.val().actual;
    // Formatear NCF (Ej: B0100000005)
    const ncfCompleto = tipoNCF + String(numeroSecuencia).padStart(8, '0');

    // --- VALIDACIÓN DE SEGURIDAD NCF ---
    if (!validarFormatoNCF(ncfCompleto)) {
      throw new Error(`El NCF generado (${ncfCompleto}) no cumple con el formato válido de la DGII.`);
    }
    // -----------------------------------

    // 2. Crear objeto Factura
    const factura = {
      ...cotizacionAFacturar,
      tipo_documento: 'Factura',
      ncf: ncfCompleto,
      rnc_cliente: rnc,
      razon_social: nombre,
      fecha_facturacion: new Date().toISOString(),
      origen_cotizacion: cotizacionAFacturar.id
    };

    // 3. Guardar en nodo 'facturas'
    await db.ref('facturas').push(factura);

    // 4. Actualizar la cotización original para marcarla como facturada
    await db.ref(`cotizaciones/${cotizacionAFacturar.id}`).update({
      ncf: ncfCompleto,
      estado: 'facturada'
    });

    mostrarNotificacion(`✅ Factura ${ncfCompleto} generada con éxito`, 'success');
    document.getElementById('modalFacturacion').classList.add('hidden');
    
    // Opcional: Recargar lista
    abrirModalCotizaciones();

  } catch (error) {
    console.error('Error facturando:', error);
    mostrarNotificacion('Error al generar factura: ' + error.message, 'error');
  }
}

// ============================================
// 📜 HISTORIAL DE FACTURAS Y REPORTE 607
// ============================================

async function abrirModalFacturas() {
  // 🛡️ VERIFICACIÓN DE SEGURIDAD
  if (!verificarPermisoAdmin()) return;

  const modal = document.getElementById('modalFacturasEmitidas');
  const lista = document.getElementById('listaFacturas');
  const filtro = document.getElementById('filtroMesFacturas');
  
  if (!modal) return;
  
  modal.classList.remove('hidden');
  lista.innerHTML = '<div class="text-center py-10"><p class="text-xl animate-pulse">🔄 Cargando facturas...</p></div>';

  // Establecer mes actual por defecto si no tiene valor
  if (!filtro.value) {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    filtro.value = `${hoy.getFullYear()}-${mes}`;
  }

  try {
    // OPTIMIZACIÓN: Cargar solo las últimas 50 facturas inicialmente
    const snapshot = await db.ref("facturas").limitToLast(50).once("value");
    const data = snapshot.val();

    if (data) {
      todasLasFacturas = Object.keys(data).map(key => ({
        ...data[key], // 1. Cargar datos primero
        id: key       // 2. SOBRESCRIBIR con la clave real de Firebase (el ID verdadero)
      })).sort((a, b) => new Date(b.fecha_facturacion) - new Date(a.fecha_facturacion));
    } else {
      todasLasFacturas = [];
    }

    renderizarFacturas();
  } catch (error) {
    console.error("Error cargando facturas:", error);
    lista.innerHTML = '<p class="text-center text-red-500">Error al cargar datos.</p>';
  }
}

async function cargarFacturasPorMes() {
  const filtro = document.getElementById('filtroMesFacturas').value;
  if (!filtro) return;

  const lista = document.getElementById('listaFacturas');
  if (lista) lista.innerHTML = '<div class="text-center py-10"><p class="text-xl animate-pulse">🔄 Buscando en el servidor...</p></div>';

  // Rango de fechas para el mes seleccionado
  const start = filtro + "-01";
  const end = filtro + "-31T23:59:59";

  try {
    const snapshot = await db.ref("facturas").orderByChild("fecha_facturacion").startAt(start).endAt(end).once("value");
    const data = snapshot.val();
    
    if (data) {
      todasLasFacturas = Object.keys(data).map(key => ({ ...data[key], id: key })).sort((a, b) => new Date(b.fecha_facturacion) - new Date(a.fecha_facturacion));
    } else {
      todasLasFacturas = [];
    }
    renderizarFacturas();
  } catch (error) {
    console.error("Error cargando mes:", error);
    if (lista) lista.innerHTML = '<p class="text-center text-red-500">Error al cargar datos del mes.</p>';
  }
}

function renderizarFacturas() {
  const lista = document.getElementById('listaFacturas');
  const filtro = document.getElementById('filtroMesFacturas').value; // YYYY-MM
  const ocultarAnuladas = document.getElementById('checkOcultarAnuladas')?.checked;
  const totalLabel = document.getElementById('totalFacturasMes');

  // LÓGICA DE RECARGA POR FECHA (Si el usuario cambia el mes, buscamos en Firebase)
  // Esto evita tener todas las facturas en memoria.
  const btnVer = document.getElementById('btnVerFacturas');
  // Verificamos si necesitamos recargar datos específicos del mes (si no están en memoria)
  // Nota: Para una implementación completa, esto debería ser una función async separada llamada al cambiar el input date.
  
  // Si no hay facturas en memoria para este mes, podríamos sugerir recargar
  // (En una implementación ideal, el evento 'change' del filtro dispararía una nueva consulta a Firebase)
  
  if (!lista) return;

  // Filtrar por mes seleccionado
  const facturasFiltradas = todasLasFacturas.filter(f => {
    if (!f.fecha_facturacion) return false;
    
    const coincideMes = f.fecha_facturacion.startsWith(filtro);
    if (ocultarAnuladas && f.estado === 'anulada') return false;

    return coincideMes;
  });

  if (facturasFiltradas.length === 0) {
    lista.innerHTML = `<div class="text-center py-10 text-gray-500">No hay facturas emitidas en ${filtro}</div>`;
    totalLabel.textContent = 'Total Facturado: RD$0.00';
    return;
  }

  let sumaTotal = 0;

  lista.innerHTML = facturasFiltradas.map(f => {
    const fecha = new Date(f.fecha_facturacion).toLocaleDateString('es-DO');
    const monto = parseFloat(f.total || 0);
    sumaTotal += monto;
    
    // Lógica de estado y botón de anular
    const esAnulada = f.estado === 'anulada';
    const esNotaCredito = f.tipo_documento === 'Nota de Crédito';
    
    // Estilos dinámicos según estado
    let estiloContenedor = "bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow";
    let estiloTexto = "font-bold text-gray-800 dark:text-gray-200";
    let estiloMonto = esNotaCredito ? 'text-red-600' : 'text-gray-800 dark:text-white';
    
    let etiquetaEstado;
    if (esAnulada) {
        etiquetaEstado = '<span class="text-xs text-red-500 dark:text-red-400 font-bold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">🚫 Anulada</span>';
        // Modificar estilos para anuladas (Gris, tachado y opaco)
        estiloContenedor = "bg-gray-100 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center opacity-60 grayscale";
        estiloTexto = "font-bold text-gray-500 line-through";
        estiloMonto = "text-gray-400 line-through";
    } else if (esNotaCredito) {
        etiquetaEstado = '<span class="text-xs text-purple-600 dark:text-purple-400 font-bold border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">↩️ Nota Crédito</span>';
    } else {
        etiquetaEstado = `
          <button onclick="imprimirFactura('${f.id}')" class="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded border border-blue-200 transition-colors font-bold mr-2">🖨️ Imprimir</button>
          <button onclick="anularFactura('${f.id}')" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded border border-red-200 transition-colors font-bold">🚫 Anular</button>
        `;
    }

    // Limpiamos el NCF para evitar que rompa el botón de eliminar si tiene comillas
    const ncfSafe = f.ncf ? f.ncf.replace(/['"]/g, "") : "SIN-NCF";

    return `
      <div class="${estiloContenedor}">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded text-sm">${f.ncf}</span>
            <span class="text-sm text-gray-500">${fecha}</span>
          </div>
          <p class="${estiloTexto} mt-1">${f.razon_social}</p>
          <p class="text-xs text-gray-500">RNC: ${f.rnc_cliente}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-black ${estiloMonto}">RD$${monto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
          <div class="mt-1 flex items-center justify-end gap-2">
            ${etiquetaEstado}
          </div>
        </div>
      </div>
    `;
  }).join('');

  totalLabel.textContent = `Total Facturado: RD$${sumaTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function imprimirFactura(idFactura) {
  const factura = todasLasFacturas.find(f => f.id === idFactura);
  if (!factura) return;

  const fecha = new Date(factura.fecha_facturacion).toLocaleDateString('es-DO');
  // Asegurar que items sea un array (Firebase a veces devuelve objetos si las claves son numéricas)
  const items = Array.isArray(factura.items) ? factura.items : (factura.items ? Object.values(factura.items) : []);
  
  const subtotal = items.reduce((s, i) => s + (i.precio || 0), 0);
  
  // Recalcular impuestos basados en el NCF para visualización correcta
  let impuesto = 0;
  let nombreImpuesto = 'ITBIS (18%)';
  const ncfPrefix = factura.ncf ? factura.ncf.substring(0, 3) : '';
  const esNotaCredito = ncfPrefix === 'B04';
  const ncfAfectado = factura.ncf_modificado ? factura.ncf_modificado.substring(0, 3) : '';
  
  if (['B01', 'B02'].includes(ncfPrefix) || (esNotaCredito && ['B01', 'B02'].includes(ncfAfectado))) {
     impuesto = subtotal * 0.18;
  } else if (ncfPrefix === 'B15' || (esNotaCredito && ncfAfectado === 'B15')) {
     impuesto = subtotal * 0.10;
     nombreImpuesto = 'ISR (10%)';
  } else if (ncfPrefix === 'B14' || (esNotaCredito && ncfAfectado === 'B14')) {
     impuesto = 0;
     nombreImpuesto = 'Exento';
  } else {
     impuesto = subtotal * 0.18; // Fallback estándar
  }
  
  const total = subtotal + impuesto;
  
  // Determinar título del documento según NCF
  let tituloDoc = 'FACTURA';
  if (ncfPrefix === 'B01') tituloDoc = 'FACTURA DE CRÉDITO FISCAL';
  else if (ncfPrefix === 'B02') tituloDoc = 'FACTURA DE CONSUMO';
  else if (ncfPrefix === 'B14') tituloDoc = 'REGÍMENES ESPECIALES';
  else if (ncfPrefix === 'B15') tituloDoc = 'GUBERNAMENTAL';
  else if (ncfPrefix === 'B04') tituloDoc = 'NOTA DE CRÉDITO';

  const filasHTML = items.map(item => `
    <tr>
      <td>${item.nombre}</td>
      <td>${item.descripcion || ''}</td>
      <td style="text-align: center;">${item.cantidad || 1}</td>
      <td style="text-align: right;">RD$${(item.precioUnitario || 0).toFixed(2)}</td>
      <td style="text-align: right;">RD$${(item.precio || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Factura ${factura.ncf}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .company-info h1 { color: #1e3a8a; margin: 0 0 5px 0; font-size: 28px; }
        .company-info p { margin: 2px 0; font-size: 13px; color: #666; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { color: #ea580c; margin: 0 0 10px 0; font-size: 18px; text-transform: uppercase; }
        .invoice-info p { margin: 3px 0; font-size: 14px; font-weight: bold; }
        .client-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
        .client-box h3 { margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-transform: uppercase; }
        .client-box p { margin: 5px 0; font-weight: bold; font-size: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #1e3a8a; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .totals { float: right; width: 300px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
        .totals-row.final { border-bottom: none; border-top: 2px solid #1e3a8a; margin-top: 10px; padding-top: 10px; font-size: 18px; color: #1e3a8a; }
        .footer { clear: both; margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>ServiGaco</h1>
          <p>RNC: 131279589</p>
          <p>Tel: (809) 682-1075</p>
          <p>Santo Domingo, República Dominicana</p>
        </div>
        <div class="invoice-info">
          <h2>${tituloDoc}</h2>
          <p>NCF: ${factura.ncf}</p>
          <p>Fecha: ${fecha}</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 5px;">Válida hasta: 31/12/2026</p>
        </div>
      </div>
      <div class="client-box">
        <h3>Datos del Cliente</h3>
        <p>Razón Social: <span style="color: #1e3a8a;">${factura.razon_social}</span></p>
        <p>RNC / Cédula: ${factura.rnc_cliente}</p>
      </div>
      <table>
        <thead><tr><th>Servicio</th><th>Descripción</th><th style="text-align: center;">Cant.</th><th style="text-align: right;">Precio Unit.</th><th style="text-align: right;">Total</th></tr></thead>
        <tbody>${filasHTML}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal:</span><span>RD$${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span></div>
        <div class="totals-row"><span>${nombreImpuesto}:</span><span>RD$${impuesto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span></div>
        <div class="totals-row final"><strong>TOTAL:</strong><strong>RD$${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</strong></div>
      </div>
      <div class="footer"><p>Gracias por preferirnos. Factura generada electrónicamente.</p></div>
    </body>
    </html>
  `;

  const ventana = window.open('', 'Factura', 'width=1000,height=800');
  ventana.document.write(html);
  ventana.document.close();
  setTimeout(() => ventana.print(), 500);
}

async function anularFactura(idFactura) {
  // 🛡️ VERIFICACIÓN DE SEGURIDAD
  if (!verificarPermisoAdmin()) return;

  const facturaOriginal = todasLasFacturas.find(f => f.id === idFactura);
  if (!facturaOriginal) return;

  // --- VALIDACIÓN DE MES CERRADO ---
  const fechaFactura = new Date(facturaOriginal.fecha_facturacion);
  const fechaActual = new Date();
  
  // Comparamos año y mes. Si es menor, es mes pasado.
  if (fechaFactura.getFullYear() < fechaActual.getFullYear() || 
     (fechaFactura.getFullYear() === fechaActual.getFullYear() && fechaFactura.getMonth() < fechaActual.getMonth())) {
    mostrarNotificacion('⛔ No se puede anular una factura de un mes fiscal cerrado.', 'error');
    return;
  }
  // ---------------------------------

  // ABRIR MODAL DE SEGURIDAD EN LUGAR DE CONFIRM()
  idFacturaAAnular = idFactura;
  const modal = document.getElementById('modalConfirmarAnulacion');
  const input = document.getElementById('inputConfirmacionAnular');
  const btn = document.getElementById('btnEjecutarAnulacion');
  
  if (modal && input && btn) {
    input.value = ''; // Limpiar input
    btn.disabled = true; // Deshabilitar botón
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100); // Enfocar automáticamente
  }
}

async function procesarAnulacion() {
  if (!idFacturaAAnular) return;
  const idFactura = idFacturaAAnular;
  const facturaOriginal = todasLasFacturas.find(f => f.id === idFactura);
  
  // Cerrar modal
  document.getElementById('modalConfirmarAnulacion').classList.add('hidden');
  idFacturaAAnular = null;

  if (!facturaOriginal) return;
  
  mostrarNotificacion('Generando Nota de Crédito...', 'info');

  try {
    // 1. Obtener secuencia B04 (Nota de Crédito)
    const secuenciaRef = db.ref('secuencias_ncf/B04');
    const result = await secuenciaRef.transaction((currentData) => {
      if (currentData === null) return { actual: 1 };
      return { ...currentData, actual: (currentData.actual || 0) + 1 };
    });

    const numeroSecuencia = result.snapshot.val().actual;
    const ncfNota = 'B04' + String(numeroSecuencia).padStart(8, '0');

    // 2. Crear Nota de Crédito
    const notaCredito = {
      ...facturaOriginal,
      tipo_documento: 'Nota de Crédito',
      ncf: ncfNota,
      ncf_modificado: facturaOriginal.ncf, // IMPORTANTE PARA 607
      fecha_facturacion: new Date().toISOString(),
      origen_factura: idFactura,
      total: -Math.abs(facturaOriginal.total) // Monto negativo
    };
    
    delete notaCredito.id; 

    // 3. Guardar Nota de Crédito
    const newRef = db.ref('facturas').push(notaCredito);
    await newRef; // Esperar a que se guarde

    // 4. ACTUALIZAR factura original (NO BORRAR) para marcarla visualmente
    await db.ref(`facturas/${idFactura}`).update({ estado: 'anulada' });

    // --- ACTUALIZACIÓN LOCAL (Para evitar recargar todo) ---
    // 1. Actualizar estado de la original en la lista local
    const indexOriginal = todasLasFacturas.findIndex(f => f.id === idFactura);
    if (indexOriginal !== -1) {
      todasLasFacturas[indexOriginal].estado = 'anulada';
    }

    // 2. Agregar la nueva nota de crédito a la lista
    notaCredito.id = newRef.key;
    todasLasFacturas.unshift(notaCredito); // Poner al principio
    todasLasFacturas.sort((a, b) => new Date(b.fecha_facturacion) - new Date(a.fecha_facturacion)); // Reordenar
    
    renderizarFacturas(); // Pintar de nuevo
    // ------------------------------------------------------

    mostrarNotificacion(`✅ Factura anulada con ${ncfNota}`, 'success');

  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al anular: ' + error.message, 'error');
  }
}

// ⛔ SEGURIDAD FISCAL: Función de eliminación desactivada
window.eliminarFacturaPermanente = function() {
  alert("⛔ ACCIÓN DENEGADA POR SEGURIDAD FISCAL\n\nSegún la Norma General 06-2018 de la DGII, las facturas con NCF emitido NO pueden ser eliminadas.\n\nDebe realizar una Nota de Crédito (Anulación) para revertir la operación.");
};

async function generarReporte607() {
  const filtro = document.getElementById('filtroMesFacturas').value;
  
  if (!filtro) {
    mostrarNotificacion('Seleccione un mes para el reporte', 'warning');
    return;
  }

  mostrarNotificacion('⏳ Descargando datos del mes...', 'info');

  // OPTIMIZACIÓN: Descargar rango de fechas específico para el reporte
  // Formato filtro: YYYY-MM -> Rango: YYYY-MM-01 a YYYY-MM-31
  const start = filtro + "-01";
  const end = filtro + "-31T23:59:59";

  const snapshot = await db.ref("facturas")
    .orderByChild("fecha_facturacion")
    .startAt(start).endAt(end)
    .once("value");
  
  const dataRaw = snapshot.val() || {};
  const facturasFiltradas = Object.values(dataRaw);

  if (facturasFiltradas.length === 0) {
    mostrarNotificacion('No hay datos para exportar en este mes', 'warning');
    return;
  }

  // Preparar datos para Excel Profesional
  const data = facturasFiltradas.map(f => {
    const rnc = f.rnc_cliente || '';
    const tipoId = rnc.length === 9 ? 1 : 2; 
    const fecha = f.fecha_facturacion.slice(0, 10); // YYYY-MM-DD
    const total = parseFloat(f.total || 0);
    const ncfModificado = f.ncf_modificado || '';
    const motivo = f.motivo_anulacion || '';
    
    // Lógica Fiscal DGII: B01 y B02 gravados al 18%
    const esGravado = f.ncf.startsWith('B01') || f.ncf.startsWith('B02');
    const itbis = esGravado ? (total - (total / 1.18)) : 0;
    const monto = total - itbis;

    return {
      "RNC/CEDULA": rnc,
      "TIPO ID": tipoId,
      "NCF": f.ncf,
      "NCF MODIFICADO": ncfModificado || " ",
      "FECHA COMPROBANTE": fecha,
      "MONTO FACTURADO": parseFloat(monto.toFixed(2)),
      "ITBIS FACTURADO": parseFloat(itbis.toFixed(2)),
      "TOTAL": parseFloat(total.toFixed(2)),
      "ESTADO": f.estado === 'anulada' ? 'ANULADA' : 'VIGENTE',
      "MOTIVO ANULACION": motivo || " "
    };
  });

  // Generar Excel Nativo (.xlsx)
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Ajuste de columnas profesional
  const wscols = [
    {wch: 15}, // RNC
    {wch: 8},  // TIPO ID
    {wch: 13}, // NCF
    {wch: 15}, // NCF MODIFICADO
    {wch: 12}, // FECHA
    {wch: 15}, // MONTO
    {wch: 15}, // ITBIS
    {wch: 15}, // TOTAL
    {wch: 30}  // MOTIVO
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte 607");

  XLSX.writeFile(workbook, `Reporte_607_${filtro}.xlsx`);
  
  mostrarNotificacion('Reporte 607 (Excel) descargado', 'success');
}

async function generarReporteDiario() {
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  mostrarNotificacion('⏳ Generando reporte de ventas de hoy...', 'info');

  // Rango de todo el día de hoy
  const start = hoy + "T00:00:00";
  const end = hoy + "T23:59:59";

  try {
    const snapshot = await db.ref("facturas")
      .orderByChild("fecha_facturacion")
      .startAt(start).endAt(end)
      .once("value");

    const dataRaw = snapshot.val() || {};
    const facturas = Object.values(dataRaw);

    if (facturas.length === 0) {
      mostrarNotificacion('No hay ventas registradas hoy', 'warning');
      return;
    }

    // Preparar datos para Excel
    const data = facturas.map(f => ({
      "Hora": new Date(f.fecha_facturacion).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
      "NCF": f.ncf,
      "Cliente": f.razon_social,
      "RNC": f.rnc_cliente || "N/A",
      "Estado": f.estado === 'anulada' ? 'ANULADA' : 'VIGENTE',
      "Total": parseFloat(f.total || 0)
    }));

    // Calcular total del día (excluyendo anuladas)
    const totalVentas = facturas
      .filter(f => f.estado !== 'anulada')
      .reduce((sum, f) => sum + parseFloat(f.total || 0), 0);

    // Agregar fila de total al final
    data.push({}); // Fila vacía
    data.push({ 
      "Cliente": "TOTAL VENDIDO HOY:", 
      "Total": totalVentas 
    });

    // Generar Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas Hoy");
    XLSX.writeFile(workbook, `Cierre_Caja_${hoy}.xlsx`);

    mostrarNotificacion('✅ Reporte descargado', 'success');

  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error generando reporte', 'error');
  }
}

function descargarBackupJSON() {
  if (todasLasFacturas.length === 0) {
    mostrarNotificacion('No hay facturas para respaldar', 'warning');
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todasLasFacturas, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "backup_facturas_" + new Date().toISOString().slice(0,10) + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  mostrarNotificacion('📦 Copia de seguridad descargada correctamente', 'success');
}

async function generarReporteIT1(formato = 'excel') {
  const filtro = document.getElementById('filtroMesFacturas').value;
  
  if (!filtro) return mostrarNotificacion('Seleccione mes', 'warning');
  mostrarNotificacion('⏳ Procesando IT-1...', 'info');

  // OPTIMIZACIÓN: Consulta específica por rango de fecha
  const start = filtro + "-01";
  const end = filtro + "-31T23:59:59";

  const snapshot = await db.ref("facturas")
    .orderByChild("fecha_facturacion")
    .startAt(start).endAt(end)
    .once("value");

  const dataRaw = snapshot.val() || {};
  const facturasFiltradas = Object.values(dataRaw).filter(f => f.estado !== 'anulada');

  if (facturasFiltradas.length === 0) {
    mostrarNotificacion('No hay operaciones para el reporte IT-1', 'warning');
    return;
  }

  // Inicializar acumuladores
  const resumen = {
    totalOperaciones: 0,
    ventasGravadas: 0,
    ventasExentas: 0,
    itbisFacturado: 0,
    cantidadFacturas: facturasFiltradas.length,
    periodo: filtro
  };

  facturasFiltradas.forEach(f => {
    const total = parseFloat(f.total || 0);
    const ncfPrefix = f.ncf.substring(0, 3);
    const esNotaCredito = f.tipo_documento === 'Nota de Crédito';
    
    // Lógica Fiscal IT-1
    let itbisCalculado = 0;
    let montoBase = total;
    let esExento = false;

    // B14 (Regímenes Especiales) y B15 (Gubernamental) suelen tratarse diferente, 
    // pero para impresión general asumiremos B14 exento y B15 gravado con retención.
    // Aquí simplificamos: B01/B02/B15 = Gravado 18%. B14 = Exento.
    
    if (ncfPrefix === 'B14') {
      esExento = true;
      itbisCalculado = 0;
      montoBase = total;
    } else {
      // Gravado 18%
      itbisCalculado = total - (total / 1.18);
      montoBase = total - itbisCalculado;
    }

    // Acumular (Las Notas de Crédito ya tienen 'total' negativo, así que restan)
    resumen.totalOperaciones += total;
    
    if (esExento) {
      resumen.ventasExentas += montoBase;
    } else {
      resumen.ventasGravadas += montoBase;
      resumen.itbisFacturado += itbisCalculado;
    }
  });

  const itbisAdelantado = 0.00; 
  const itbisAPagar = resumen.itbisFacturado - itbisAdelantado;
  
  if (formato === 'excel') {
    // --- EXPORTAR EXCEL ---
    const data = [
      { "CONCEPTO": "Periodo Fiscal", "VALOR": filtro },
      { "CONCEPTO": "Cantidad Comprobantes", "VALOR": resumen.cantidadFacturas },
      { "CONCEPTO": "", "VALOR": "" }, // Espacio
      { "CONCEPTO": "TOTAL OPERACIONES (VENTAS BRUTAS)", "VALOR": parseFloat(resumen.totalOperaciones.toFixed(2)) },
      { "CONCEPTO": "Ventas Exentas (B14)", "VALOR": parseFloat(resumen.ventasExentas.toFixed(2)) },
      { "CONCEPTO": "Ventas Gravadas (Base Imponible)", "VALOR": parseFloat(resumen.ventasGravadas.toFixed(2)) },
      { "CONCEPTO": "", "VALOR": "" },
      { "CONCEPTO": "ITBIS Facturado (18%)", "VALOR": parseFloat(resumen.itbisFacturado.toFixed(2)) },
      { "CONCEPTO": "ITBIS Adelantado (Compras)", "VALOR": parseFloat(itbisAdelantado.toFixed(2)) },
      { "CONCEPTO": "ITBIS A PAGAR", "VALOR": parseFloat(itbisAPagar.toFixed(2)) }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const wscols = [{wch: 40}, {wch: 20}];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen IT-1");
    XLSX.writeFile(workbook, `Resumen_IT1_${filtro}.xlsx`);
    mostrarNotificacion('📗 Excel IT-1 generado', 'success');

  } else {
    // --- EXPORTAR PDF ---
    imprimirReporteIT1(resumen, itbisAPagar);
  }
}

function imprimirReporteIT1(resumen, itbisAPagar) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reporte Mensual IT-1</title>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        .header h1 { margin: 0; color: #1e3a8a; font-size: 24px; }
        .header p { margin: 5px 0; color: #666; }
        .box { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; background: #f9fafb; }
        .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
        .row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #555; }
        .value { font-family: 'Courier New', monospace; font-weight: bold; }
        .total-box { background: #1e3a8a; color: white; padding: 20px; border-radius: 8px; text-align: right; font-size: 18px; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Resumen de Declaración IT-1</h1>
        <p>Periodo Fiscal: <strong>${resumen.periodo}</strong></p>
        <p>ServiGaco - RNC: 131279589</p>
      </div>

      <div class="box">
        <h3 style="margin-top:0; color:#2563eb;">1. Operaciones Reportadas</h3>
        <div class="row">
          <span class="label">Total Facturado (Ventas Brutas)</span>
          <span class="value">RD$ ${resumen.totalOperaciones.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
        <div class="row">
          <span class="label">Total Ventas Exentas</span>
          <span class="value">RD$ ${resumen.ventasExentas.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
        <div class="row">
          <span class="label">Total Ventas Gravadas (Base)</span>
          <span class="value">RD$ ${resumen.ventasGravadas.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
      </div>

      <div class="box">
        <h3 style="margin-top:0; color:#ea580c;">2. Liquidación del Impuesto</h3>
        <div class="row">
          <span class="label">ITBIS Facturado (18%)</span>
          <span class="value">RD$ ${resumen.itbisFacturado.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
        <div class="row">
          <span class="label">ITBIS Adelantado (Compras)</span>
          <span class="value">RD$ 0.00</span>
        </div>
      </div>

      <div class="total-box">
        ITBIS A PAGAR: <strong>RD$ ${itbisAPagar.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
      </div>

      <div class="footer">
        Documento generado para fines de control interno. Verificar con su contador antes de declarar en DGII.
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', 'IT1', 'width=900,height=1100');
  ventana.document.write(html);
  ventana.document.close();
  setTimeout(() => ventana.print(), 500);
}

async function abrirModalCotizaciones() {
  const container = document.getElementById('listaCotizacionesGuardadas');
  if (container) container.innerHTML = '<div class="text-center py-10"><p class="text-xl animate-pulse">🔥 Cargando desde Base de Datos...</p></div>';
  
  document.getElementById('modalCotizacionesGuardadas')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  try {
    // Cargar datos frescos de Firebase
    // OPTIMIZACIÓN: Solo las últimas 50 cotizaciones generales
    const snapshot = await db.ref("cotizaciones").limitToLast(50).once("value");
    const data = snapshot.val();

    if (data) {
      todasLasCotizaciones = Object.keys(data).map(key => ({
        ...data[key], // 1. Cargar datos primero (si trae un id falso, se carga aquí)
        id: key       // 2. SOBRESCRIBIR con la clave real de Firebase (el ID verdadero)
      })).sort((a, b) => {
        // Ordenar descendente por fecha
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

// ============================================
// 📊 LÓGICA DEL DASHBOARD
// ============================================

async function abrirModalDashboard() {
  // 🛡️ VERIFICACIÓN DE SEGURIDAD
  if (!verificarPermisoAdmin()) return;

  const modal = document.getElementById('modalDashboard');
  modal.classList.remove('hidden');

  // Establecer fechas por defecto (Mes Actual)
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  const inputInicio = document.getElementById('dashFechaInicio');
  const inputFin = document.getElementById('dashFechaFin');
  
  if (inputInicio && inputFin) {
      inputInicio.value = formatDate(firstDay);
      inputFin.value = formatDate(lastDay);
  }

  await cargarDatosDashboard();
}

async function cargarDatosDashboard() {
  // Elementos de UI
  const elVentasHoy = document.getElementById('dashVentasHoy');
  const elVentasMes = document.getElementById('dashVentasMes');
  const elTotalTesis = document.getElementById('dashTotalTesis');
  const elTotalFacturas = document.getElementById('dashTotalFacturas');
  const listaTesis = document.getElementById('dashListaTesis');
  const listaFacturas = document.getElementById('dashListaFacturas');
  
  const fechaInicio = document.getElementById('dashFechaInicio').value;
  const fechaFin = document.getElementById('dashFechaFin').value;

  // Reset UI
  elVentasHoy.textContent = '...';
  elVentasMes.textContent = '...';
  listaTesis.innerHTML = '<p class="p-6 text-center text-gray-400 animate-pulse">Cargando datos...</p>';
  listaFacturas.innerHTML = '<p class="p-6 text-center text-gray-400 animate-pulse">Cargando datos...</p>';

  try {
    const startAt = fechaInicio;
    const endAt = fechaFin + "T23:59:59";

    // 1. Cargar Facturas
    const snapFacturas = await db.ref("facturas")
      .orderByChild("fecha_facturacion")
      .startAt(startAt)
      .endAt(endAt)
      .once("value");
      
    const dataFacturas = snapFacturas.val() || {};
    const facturasArray = Object.values(dataFacturas).sort((a, b) => new Date(b.fecha_facturacion) - new Date(a.fecha_facturacion));

    // 2. Cargar Tesis
    const snapCotizaciones = await db.ref("cotizaciones")
      .orderByChild("fecha")
      .startAt(startAt)
      .endAt(endAt)
      .once("value");
      
    const dataCotizaciones = snapCotizaciones.val() || {};
    const tesisArray = Object.values(dataCotizaciones)
      .filter(c => c.tipo === 'Tesis')
      .sort((a, b) => new Date(b.fecha || b.timestamp) - new Date(a.fecha || a.timestamp));

    // --- CÁLCULOS ---
    const hoy = new Date().toISOString().slice(0, 10);
    const mesActual = new Date().toISOString().slice(0, 7);

    let totalHoy = 0;
    let totalMes = 0;
    let countFacturasMes = 0;
    let totalPeriodo = 0;
    let countFacturasPeriodo = 0;

    facturasArray.forEach(f => {
      if (f.estado === 'anulada') return;
      const fechaF = f.fecha_facturacion.slice(0, 10);
      const mesF = f.fecha_facturacion.slice(0, 7);
      const monto = parseFloat(f.total || 0);

      if (fechaF === hoy) totalHoy += monto;
      if (mesF === mesActual) {
        totalMes += monto;
        countFacturasMes++;
      }
      
      totalPeriodo += monto;
      countFacturasPeriodo++;
    });

    // --- ACTUALIZAR UI ---
    elVentasHoy.textContent = `RD$${totalHoy.toLocaleString('es-DO', {minimumFractionDigits: 2})}`;
    elVentasMes.textContent = `RD$${totalPeriodo.toLocaleString('es-DO', {minimumFractionDigits: 2})}`;
    elTotalTesis.textContent = tesisArray.length;
    elTotalFacturas.textContent = countFacturasPeriodo;

    // --- LISTA TESIS ---
    if (tesisArray.length === 0) {
      listaTesis.innerHTML = '<p class="p-4 text-center text-gray-400">No hay tesis recientes.</p>';
    } else {
      listaTesis.innerHTML = tesisArray.slice(0, 10).map(t => {
        const fecha = new Date(t.fecha || t.timestamp).toLocaleDateString('es-DO');
        return `
          <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${t.nombre}</p>
                <p class="text-xs text-gray-500">${t.descripcion || 'Sin detalle'}</p>
              </div>
              <span class="text-xs font-mono text-gray-400">${fecha}</span>
            </div>
            <p class="text-right font-bold text-blue-600 text-sm mt-1">RD$${parseFloat(t.total).toLocaleString()}</p>
          </div>
        `;
      }).join('');
    }

    // --- LISTA FACTURAS ---
    if (facturasArray.length === 0) {
      listaFacturas.innerHTML = '<p class="p-4 text-center text-gray-400">No hay facturas recientes.</p>';
    } else {
      listaFacturas.innerHTML = facturasArray.slice(0, 10).map(f => {
        const fecha = new Date(f.fecha_facturacion).toLocaleDateString('es-DO');
        const esAnulada = f.estado === 'anulada';
        const colorMonto = esAnulada ? 'text-gray-400 line-through' : 'text-purple-600';
        const estado = esAnulada ? '<span class="text-[10px] bg-red-100 text-red-600 px-1 rounded">Anulada</span>' : '';

        return `
          <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${f.razon_social}</p>
                <p class="text-xs text-gray-500 font-mono">${f.ncf}</p>
              </div>
              <div class="text-right">
                <p class="font-bold ${colorMonto} text-sm">RD$${parseFloat(f.total).toLocaleString()}</p>
                ${estado}
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-1">${fecha}</p>
          </div>
        `;
      }).join('');
    }

  } catch (error) {
    console.error("Error dashboard:", error);
    listaTesis.innerHTML = '<p class="text-red-500 p-4">Error al cargar datos.</p>';
  }
}

// ============================================
// 💬 WHATSAPP
// ============================================

function enviarWhatsApp() {
  if (cotizacion.length === 0) {
    mostrarNotificacion('Agrega productos antes de enviar', 'warning');
    return;
  }

  let mensaje = "*HOLA, QUIERO COTIZAR LO SIGUIENTE:*\n\n";
  
  cotizacion.forEach((item, i) => {
    mensaje += `*${i + 1}. ${item.nombre}*\n`;
    mensaje += `   ${item.descripcion}\n`;
    mensaje += `   Precio: RD$${item.precio.toFixed(2)}\n\n`;
  });

  const totalEl = document.getElementById('totalAmount');
  const totalTexto = totalEl ? totalEl.textContent : '0.00';
  
  mensaje += `*TOTAL ESTIMADO: ${totalTexto}*`;

  const numeroTelefono = "18096821075"; // Tu número
  const url = `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank');
}

// ============================================
// 🔔 NOTIFICACIONES TOAST
// ============================================

function mostrarNotificacion(mensaje, tipo = 'success') {
  // Crear contenedor si no existe
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Iconos según tipo
  const iconos = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <span class="toast-icon">${iconos[tipo]}</span>
    <span class="toast-message">${mensaje}</span>
  `;

  container.appendChild(toast);

  // Eliminar después de 3 segundos
  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.4s forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================
// ☁️ FIREBASE DATABASE LOGS
// ============================================

function registrarLogVenta(datos, accion = 'guardar') {
  // Esta función se mantiene solo para el log de ventas al imprimir (si se desea)
  // O se puede redirigir a una colección 'ventas' en Firebase
  
  try {
    db.ref("ventas_log").push({
      ...datos,
      accion: accion,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    console.log(`✅ Registro de venta guardado en Firebase`);
  } catch (e) {
    console.error("Error guardando log de venta:", e);
  }
}

// ============================================
// �🚀 INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.protocol === 'file:') {
    alert("⚠️ ATENCIÓN: Estás abriendo el archivo directamente (file://).\n\nPara que la generación de PDF funcione, debes usar el servidor local.\n\nEjecuta 'node server.js' y abre http://localhost:3000");
  }

  marcarPaginaActiva();
  configurarMenuMovil();
  inicializarEventListeners();
  inicializarSeguridad(); // ← Iniciar listener de Auth
  inicializarPrecioTiempoReal(); // ← Agregado
  inicializarCombos(); // ← NUEVO: Cargar combos al inicio
  const btnGenPDF = document.getElementById('generarPDF'); // Botón grande
  if (btnGenPDF) btnGenPDF.addEventListener('click', imprimirCotizacion);

  console.log('✅ Script inicializado. Escribe "probarConexionFirebase()" en la consola para verificar.');
});

// ============================================
// 🧪 HERRAMIENTA DE DIAGNÓSTICO (GLOBAL)
// ============================================
window.probarConexionFirebase = async function() {
  console.clear();
  console.group("🕵️ Diagnóstico de Conexión Firebase");
  console.log("1. Verificando URL:", firebaseConfig.databaseURL);
  
  try {
    const testRef = db.ref(".info/connected");
    console.log("2. Verificando estado de conexión...");
    const snap = await testRef.once("value");
    
    if (snap.val() === true) {
      console.log("   ✅ Cliente conectado al servidor.");
    } else {
      console.warn("   ⚠️ Cliente desconectado (posiblemente offline).");
    }

    console.log("3. Intentando escribir dato de prueba...");
    const writeRef = db.ref("diagnostico/prueba_" + Date.now());
    await writeRef.set({ prueba: "exitosa", fecha: new Date().toISOString() });
    console.log("   ✅ Escritura exitosa en Realtime Database.");

    console.log("4. Limpiando dato de prueba...");
    await writeRef.remove();
    console.log("   ✅ Borrado exitoso.");

    alert("✅ CONEXIÓN EXITOSA\n\nTu calculadora está conectada correctamente a Firebase Realtime Database.");
  } catch (e) {
    console.error("❌ FALLO:", e);
    alert("❌ ERROR DE CONEXIÓN: " + e.message);
  }
  console.groupEnd();
};

// ============================================
// 🔐 LÓGICA DE AUTENTICACIÓN Y SEGURIDAD
// ============================================

function inicializarSeguridad() {
  auth.onAuthStateChanged(user => {
    actualizarIconoAuth(user);
    // Si la seguridad está activa, ocultamos cosas automáticamente
    if (ACTIVAR_SEGURIDAD && !user) {
      // Opcional: Ocultar botones sensibles visualmente si se desea
      // document.getElementById('btnVerFacturas').style.display = 'none';
    }
  });
}

function verificarPermisoAdmin() {
  // 1. Si el interruptor está apagado, DEJAR PASAR A TODOS
  if (!ACTIVAR_SEGURIDAD) return true;

  // 2. Si está encendido, verificar usuario real
  const user = auth.currentUser;
  if (user) {
    return true; // Tiene permiso
  } else {
    // No tiene permiso, mostrar login
    document.getElementById('modalLogin').classList.remove('hidden');
    mostrarNotificacion('🔒 Acceso restringido a personal autorizado', 'warning');
    return false;
  }
}

function manejarClickAuth() {
  const user = auth.currentUser;
  if (user) {
    // 🛑 Confirmación de seguridad antes de salir
    if (!confirm("¿Estás seguro de que deseas cerrar la sesión?")) return;

    // Si está logueado, cerrar sesión
    auth.signOut().then(() => {
      mostrarNotificacion('Sesión cerrada', 'info');
      if (ACTIVAR_SEGURIDAD) {
        // Cerrar modales protegidos si están abiertos
        document.getElementById('modalFacturacion').classList.add('hidden');
        document.getElementById('modalFacturasEmitidas').classList.add('hidden');
      }
    });
  } else {
    // Si no, abrir modal login
    document.getElementById('modalLogin').classList.remove('hidden');
  }
}

function actualizarIconoAuth(user) {
  const btn = document.getElementById('btnAuthNav');
  if (!btn) return;

  if (user) {
    const nombreUsuario = user.email ? user.email.split('@')[0] : 'Usuario';
    // Botón rojo explícito con texto "Salir" y el nombre del usuario
    btn.innerHTML = `<span class="mr-1 text-lg">🚪</span><span class="font-bold">Salir (${nombreUsuario})</span>`;
    btn.className = "flex items-center text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-3 py-2 mr-2 transition-all shadow-md";
    btn.title = "Cerrar Sesión";
  } else {
    // Estado original (Candado gris discreto)
    btn.innerHTML = `<span id="iconAuth">🔒</span>`;
    btn.className = "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all";
    btn.title = "Acceso Empleados";
  }
}

async function procesarLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('usuarioLogin').value.trim();
  const pass = document.getElementById('passwordLogin').value;
  
  // 🔐 TRUCO FIREBASE: Convertimos usuario a email interno
  const email = `${usuario}@servigaco.com`;

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    document.getElementById('modalLogin').classList.add('hidden');
    reproducirSonidoExito(); // 🎵 Sonido de éxito
    const nombreDisplay = usuario.charAt(0).toUpperCase() + usuario.slice(1);
    mostrarBienvenida(nombreDisplay); // 🎉 Nueva bienvenida visual grande
    document.getElementById('formLogin').reset();
  } catch (error) {
    console.error(error);
    mostrarNotificacion('❌ Error: Credenciales incorrectas', 'error');
  }
}

// ============================================
// ⚡ GESTIÓN DE COMBOS (FIREBASE)
// ============================================

function inicializarCombos() {
  const lista = document.getElementById('listaCombos');
  if (!lista) return;

  // Escuchar cambios en tiempo real en la colección 'combos'
  db.ref('combos').on('value', (snapshot) => {
    const data = snapshot.val();
    lista.innerHTML = '';

    if (!data) {
      lista.innerHTML = '<p class="text-gray-400 text-sm col-span-full italic p-2">No hay combos guardados. Crea uno abajo.</p>';
      return;
    }

    // Renderizar botones
    Object.keys(data).forEach(key => {
      const combo = data[key];
      const precio = parseFloat(combo.precio || 0).toFixed(2);
      
      const btn = document.createElement('div');
      btn.className = 'relative group';
      btn.innerHTML = `
        <button onclick="usarCombo('${key}')" class="w-full text-left p-3 rounded-xl bg-white border border-gray-200 hover:border-purple-500 hover:ring-1 hover:ring-purple-500 hover:shadow-md transition-all group-hover:-translate-y-0.5 flex justify-between items-center gap-2">
          <span class="font-bold text-gray-700 text-sm leading-tight">${combo.nombre}</span>
          <span class="text-purple-700 font-black text-md bg-purple-50 px-2 py-1 rounded whitespace-nowrap">RD$${precio}</span>
        </button>
        <button onclick="eliminarCombo('${key}')" class="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all shadow-sm text-xs font-bold z-10" title="Eliminar Combo">✕</button>
      `;
      lista.appendChild(btn);
    });
  });
}

async function guardarNuevoCombo() {
  // Usamos tu sistema de seguridad existente
  if (!verificarPermisoAdmin()) return;

  const nombreInput = document.getElementById('inputNombreCombo');
  const precioInput = document.getElementById('inputPrecioCombo');
  
  const nombre = nombreInput.value.trim();
  const precio = parseFloat(precioInput.value);

  if (!nombre || isNaN(precio)) {
    mostrarNotificacion('Ingresa una descripción y un precio válido', 'warning');
    return;
  }

  try {
    await db.ref('combos').push({
      nombre: nombre,
      precio: precio,
      creado: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Limpiar campos
    nombreInput.value = '';
    precioInput.value = '';
    mostrarNotificacion('✅ Combo guardado exitosamente', 'success');
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
  }
}

async function usarCombo(id) {
  try {
    const snapshot = await db.ref(`combos/${id}`).once('value');
    const combo = snapshot.val();
    
    if (combo) {
      agregarACotizacion({
        nombre: '📦 Combo / Paquete',
        descripcion: combo.nombre,
        cantidad: 1,
        precioUnitario: parseFloat(combo.precio),
        precio: parseFloat(combo.precio)
      });
      mostrarNotificacion('Combo agregado a la cotización', 'success');
    }
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al cargar el combo', 'error');
  }
}

async function eliminarCombo(id) {
  if (!verificarPermisoAdmin()) return;
  
  if (confirm('¿Estás seguro de eliminar este combo permanentemente?')) {
    try {
      await db.ref(`combos/${id}`).remove();
      mostrarNotificacion('Combo eliminado', 'success');
    } catch (error) {
      mostrarNotificacion('Error al eliminar', 'error');
    }
  }
}

// ============================================
// 🎵 EFECTOS DE SONIDO
// ============================================
function reproducirSonidoExito() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Un "ding" suave y agradable (Onda Senoidal)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // Nota Do (C5)
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // Sube a Do (C6) rápidamente

    gain.gain.setValueAtTime(0.05, ctx.currentTime); // Volumen suave (5%)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5); // Desvanecimiento lento (Fade out)

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.warn("Audio no soportado o bloqueado:", e);
  }
}

// ============================================
// 🎉 BIENVENIDA ANIMADA (GRANDE Y LINDA)
// ============================================
function mostrarBienvenida(nombre) {
  // 1. Crear el overlay (fondo oscuro borroso)
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-500';
  overlay.style.opacity = '0'; // Inicio invisible para fade-in

  // 2. Crear la tarjeta de bienvenida
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-gray-800 p-12 rounded-[2rem] shadow-2xl text-center transform scale-50 opacity-0 border-4 border-blue-50 dark:border-blue-900/30';
  // Efecto rebote "pop" elástico muy suave
  card.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'; 

  card.innerHTML = `
    <div class="text-8xl mb-6 animate-bounce">👋</div>
    <h2 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6 tracking-tight">
      ¡Hola, ${nombre}!
    </h2>
    <p class="text-2xl text-gray-600 dark:text-gray-300 font-medium">
      Qué alegría verte de nuevo. 🚀
    </p>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // 3. Activar animación de entrada
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    card.style.transform = 'scale(1)';
    card.style.opacity = '1';
  });

  // 4. Remover después de 4 segundos (duración extendida)
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }, 4000);
}