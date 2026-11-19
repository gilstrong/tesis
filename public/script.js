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

let PRECIOS;
let PRECIOS_LEGAL_BN;
let PRECIOS_LEGAL_COLOR;
let PRECIOS_LEGAL_SATINADO;
let PRECIOS_LEGAL_HILO_EXTRA;
let PRECIO_ITLA_SATINADO;
let TAPA_DURA;
let PRECIO_TAPA_DURA_LEGAL;
let PRECIO_TAPA_DURA_ITLA;
let VINIL;
let PRECIOS_ENCUADERNADO;
let PRECIOS_SERVICIOS;
let TIEMPO_ENTREGA;

const BLOQUE_MENSAJE_PAGINA_SIGUIENTE = `
  <div class="mensaje-pagina-siguiente">
    <span class="flecha">⬇</span>
    <span class="texto">
      Debajo encontrarás las cuentas bancarias y el ejemplar del empastado
    </span>
  </div>
`;


// ============================================
// 🖼️ IMÁGENES DE EJEMPLARES POR COLOR
// ============================================

const SERVIGACO_ASSET_URL = (filename) =>
  new URL(filename, `${window.location.origin}/`).href;

const IMAGEN_EJEMPLAR_TAPA = Object.freeze({
  beige: SERVIGACO_ASSET_URL('beige.png'),
  morado: SERVIGACO_ASSET_URL('morado.png'),
  blanco: SERVIGACO_ASSET_URL('blanca.png'),
  azul_cielo: SERVIGACO_ASSET_URL('azulcielo.png')
});

const BLOQUE_CUENTAS = `
  <div class="cuentas-pago">
    <img src="${SERVIGACO_ASSET_URL('bhd.jpg')}" alt="Cuenta BHD" class="img-cuenta">
    <img src="${SERVIGACO_ASSET_URL('popular.jpg')}" alt="Cuenta Popular" class="img-cuenta">
    <img src="${SERVIGACO_ASSET_URL('banreservas.jpg')}" alt="Cuenta Banreservas" class="img-cuenta">
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
 * Obtiene el precio unitario correspondiente a una cantidad según una tabla de rangos
 * @param {Array} tabla - Tabla de rangos de precios
 * @param {number} cantidad - Cantidad a buscar
 * @returns {number} Precio unitario
 */
function obtenerPrecioRango(tabla, cantidad) {
  const rango = tabla.find(r => cantidad >= r.min && (r.max === null || cantidad <= r.max));
  return rango ? rango.precio : 0;
}

/**
 * Calcula el precio de encuadernación según el número de páginas
 * @param {number} paginas - Número de páginas
 * @returns {number} Precio unitario del encuadernado
 */
function calcularPrecioEncuadernado(paginas) {
  return obtenerPrecioRango(PRECIOS_ENCUADERNADO, paginas);
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

function nombreArchivoPDF(id, colorTapa, tipoEmp) {
  let sub = 'vinil';
  if (tipoEmp === 'espiral') {
    sub = 'espiral';
  } else if (colorTapa) {
    sub = colorTapa.replace(/_/g, '-');
  }
  return `${id}-${sub}.pdf`;
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
  itlaCheckbox: document.getElementById('itlaCheckbox'),
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
let isProcessingAction = false; // Flag para evitar doble click en acciones
let idCotizacionAEliminar = null; // Variable temporal para eliminación

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();
const ACTIVAR_SEGURIDAD = true; // Control de seguridad
let cotizacionHistoricaCargada = false;

const THESIS_SELECT_PRESETS = {
  tamano: {
    icon: 'ti-ruler',
    tone: 'blue',
    placeholder: 'Elige el formato de tu tesis',
    options: {
      carta: { title: 'Carta', description: '8½ × 11 pulgadas · formato estándar', icon: 'ti-file-text' },
      legal: { title: 'Legal', description: '8½ × 14 pulgadas · formato extendido', icon: 'ti-file-description' },
      tabloide: { title: 'Tabloide', description: '11 × 17 pulgadas · papel satinado', icon: 'ti-layout-dashboard' }
    }
  },
  papel: {
    icon: 'ti-files',
    tone: 'purple',
    placeholder: 'Elige el acabado del papel',
    options: {
      bond: { description: 'Acabado mate para impresión cotidiana', icon: 'ti-file-text' },
      hilo: { description: 'Textura distintiva para una presentación formal', icon: 'ti-files' },
      satinado: { description: 'Superficie lisa con mayor intensidad de color', icon: 'ti-sun' }
    }
  },
  tipoEmpastado: {
    icon: 'ti-book',
    tone: 'amber',
    placeholder: 'Elige cómo presentar los tomos',
    options: {
      tapa_dura: { description: 'Cubierta rígida · presentación clásica', icon: 'ti-book-2' },
      vinil: { description: 'Cubierta flexible · acabado plastificado', icon: 'ti-book' },
      espiral: { description: 'Encuadernado flexible y fácil de consultar', icon: 'ti-paperclip' }
    }
  },
  colorTapa: {
    icon: 'ti-palette',
    tone: 'rose',
    placeholder: 'Elige el color de la cubierta',
    options: {
      beige: { description: 'Beige', tone: 'amber', swatch: '#d6c3a1' },
      morado: { description: 'Morado', tone: 'purple', swatch: '#8b5cf6' },
      azul_marino: { description: 'Azul marino', tone: 'blue', swatch: '#1e3a8a' },
      azul_cielo: { description: 'Azul cielo', tone: 'cyan', swatch: '#38bdf8' },
      rojo: { description: 'Rojo', tone: 'rose', swatch: '#e11d48' },
      verde_botella: { description: 'Verde botella', tone: 'green', swatch: '#166534' },
      amarillo_medicina: { description: 'Amarillo medicina', tone: 'amber', swatch: '#eab308' },
      blanco: { description: 'Blanco', tone: 'slate', swatch: '#f8fafc' }
    }
  },
  lomo: {
    icon: 'ti-ruler',
    tone: 'cyan',
    placeholder: 'Indica si el tomo lleva lomo',
    options: {
      no: { description: 'Sin costo adicional de lomo', icon: 'ti-file-x', tone: 'slate' },
      si: { description: 'Añadir lomo a cada tomo', icon: 'ti-circle-check', tone: 'green' }
    }
  },
  llevaCd: {
    icon: 'ti-disc',
    tone: 'purple',
    placeholder: 'Indica si incluirás CD',
    options: {
      no: { description: 'Sin CD en esta cotización', icon: 'ti-file-x', tone: 'slate' },
      si: { description: 'Añadir CD y especificar la cantidad', icon: 'ti-disc', tone: 'blue' }
    }
  }
};

function crearIconoOpcion(option, tone) {
  const iconBox = document.createElement('span');
  iconBox.className = `sg-option-icon-box sg-thesis-tone-${tone}`;
  if (option.swatch) {
    const swatch = document.createElement('span');
    swatch.className = 'sg-thesis-swatch';
    swatch.style.setProperty('--sg-thesis-swatch-color', option.swatch);
    iconBox.append(swatch);
  } else {
    const icon = document.createElement('i');
    icon.className = `ti ${option.icon || 'ti-check'}`;
    icon.setAttribute('aria-hidden', 'true');
    iconBox.append(icon);
  }
  return iconBox;
}

function sincronizarSelectorTesis(wrapper) {
  const select = wrapper.querySelector('select');
  const trigger = wrapper.querySelector('.sg-trigger');
  const triggerIcon = wrapper.querySelector('.sg-trigger-icon-box');
  const triggerTitle = wrapper.querySelector('.sg-trigger-title');
  const triggerDescription = wrapper.querySelector('.sg-trigger-desc');
  const options = Array.from(wrapper.querySelectorAll('.sg-option'));
  const selected = options.find(option => option.dataset.value === select.value);

  trigger.disabled = select.disabled;
  trigger.setAttribute('aria-disabled', String(select.disabled));
  trigger.setAttribute('aria-required', String(select.required));
  if (wrapper.classList.contains('sg-invalid')) {
    trigger.setAttribute('aria-invalid', 'true');
  } else {
    trigger.removeAttribute('aria-invalid');
  }
  if (selected) {
    options.forEach(option => option.setAttribute('aria-selected', String(option === selected)));
    triggerTitle.textContent = selected.querySelector('.sg-option-title').textContent;
    triggerDescription.textContent = selected.querySelector('.sg-option-desc').textContent;
    const optionIcon = selected.querySelector('.sg-option-icon-box');
    triggerIcon.className = `sg-trigger-icon-box ${Array.from(optionIcon.classList).find(name => name.startsWith('sg-thesis-tone-')) || ''}`;
    triggerIcon.replaceChildren(...Array.from(optionIcon.childNodes).map(node => node.cloneNode(true)));
  } else {
    options.forEach(option => option.setAttribute('aria-selected', 'false'));
    triggerTitle.textContent = wrapper.dataset.placeholder;
    triggerDescription.textContent = 'Selecciona una opción para continuar';
    triggerIcon.className = `sg-trigger-icon-box sg-thesis-tone-${wrapper.dataset.tone}`;
    const icon = document.createElement('i');
    icon.className = `ti ${wrapper.dataset.icon}`;
    icon.setAttribute('aria-hidden', 'true');
    triggerIcon.replaceChildren(icon);
  }
}

function inicializarSelectorTesis(select, config = {}) {
  if (!select || select.dataset.thesisPicker === 'true' || select.classList.contains('sg-native-select')) return;
  const preset = config.preset || THESIS_SELECT_PRESETS[select.id];
  if (!preset && !select.matches('[data-thesis-service-field]')) return;

  const label = Array.from(select.closest('.form-group, fieldset')?.querySelectorAll('label') || [])
    .find(item => item.htmlFor === select.id);
  const labelText = label?.textContent.trim().replace(/\s+/g, ' ') || select.dataset.thesisServiceFieldLabel || 'Selecciona una opción';
  const id = `tesis-select-${select.id}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'sg-select-wrapper sg-thesis-select';
  wrapper.dataset.placeholder = preset?.placeholder || `Selecciona ${labelText.toLocaleLowerCase()}`;
  wrapper.dataset.icon = preset?.icon || 'ti-list-details';
  wrapper.dataset.tone = preset?.tone || 'cyan';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sg-trigger';
  trigger.id = `${id}-trigger`;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-controls', `${id}-options`);
  if (label) {
    if (!label.id) label.id = `${id}-label`;
    trigger.setAttribute('aria-labelledby', label.id);
  } else {
    trigger.setAttribute('aria-label', labelText);
  }
  if (select.getAttribute('aria-describedby')) {
    trigger.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
  }

  const left = document.createElement('span');
  left.className = 'sg-trigger-left';
  const triggerIcon = document.createElement('span');
  triggerIcon.className = `sg-trigger-icon-box sg-thesis-tone-${wrapper.dataset.tone}`;
  const defaultIcon = document.createElement('i');
  defaultIcon.className = `ti ${wrapper.dataset.icon}`;
  defaultIcon.setAttribute('aria-hidden', 'true');
  triggerIcon.append(defaultIcon);
  const text = document.createElement('span');
  text.className = 'sg-trigger-text';
  const title = document.createElement('span');
  title.className = 'sg-trigger-title';
  const description = document.createElement('span');
  description.className = 'sg-trigger-desc';
  text.append(title, description);
  left.append(triggerIcon, text);
  const arrow = document.createElement('span');
  arrow.className = 'sg-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>';
  trigger.append(left, arrow);

  const dropdown = document.createElement('div');
  dropdown.className = 'sg-dropdown';
  dropdown.setAttribute('aria-hidden', 'true');
  const list = document.createElement('ul');
  list.className = 'sg-options-list';
  list.id = `${id}-options`;
  list.setAttribute('role', 'listbox');
  const choices = Array.from(select.options).filter(option => !option.disabled);
  choices.forEach((nativeOption, index) => {
    const optionConfig = preset?.options?.[nativeOption.value] || {};
    const option = document.createElement('li');
    option.className = 'sg-option';
    option.id = `${id}-option-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.dataset.value = nativeOption.value;
    option.style.setProperty('--sg-thesis-option-delay', `${Math.min(index, 7) * 18}ms`);

    const tone = optionConfig.tone || preset?.tone || 'cyan';
    const icon = crearIconoOpcion({
      icon: optionConfig.icon || preset?.icon,
      swatch: optionConfig.swatch
    }, tone);
    const info = document.createElement('span');
    info.className = 'sg-option-info';
    const optionTitle = document.createElement('span');
    optionTitle.className = 'sg-option-title';
    optionTitle.textContent = optionConfig.title || nativeOption.textContent.trim();
    const optionDescription = document.createElement('span');
    optionDescription.className = 'sg-option-desc';
    optionDescription.textContent = optionConfig.description || nativeOption.dataset.description || `Opción para ${labelText.toLocaleLowerCase()}`;
    const check = document.createElement('span');
    check.className = 'sg-check-icon';
    check.setAttribute('aria-hidden', 'true');
    const checkIcon = document.createElement('i');
    checkIcon.className = 'ti ti-check';
    check.append(checkIcon);
    info.append(optionTitle, optionDescription);
    option.append(icon, info, check);
    list.append(option);
  });
  dropdown.append(list);

  const errorMessage = document.createElement('span');
  errorMessage.className = 'sg-thesis-error';
  errorMessage.id = `${id}-error`;
  errorMessage.setAttribute('role', 'alert');
  errorMessage.hidden = true;

  select.parentNode.insertBefore(wrapper, select);
  wrapper.append(select, trigger, dropdown, errorMessage);
  select.classList.add('sg-native-select');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.dataset.thesisPicker = 'true';
  select.dataset.thesisPickerTrigger = trigger.id;

  const describedBy = select.getAttribute('aria-describedby');
  const showError = () => {
    errorMessage.textContent = select.validationMessage || 'Selecciona una opción para continuar.';
    errorMessage.hidden = false;
    wrapper.classList.add('sg-invalid');
    trigger.setAttribute('aria-invalid', 'true');
    trigger.setAttribute('aria-describedby', [describedBy, errorMessage.id].filter(Boolean).join(' '));
    trigger.focus();
  };
  const clearError = () => {
    wrapper.classList.remove('sg-invalid');
    errorMessage.textContent = '';
    errorMessage.hidden = true;
    trigger.removeAttribute('aria-invalid');
    if (describedBy) trigger.setAttribute('aria-describedby', describedBy);
    else trigger.removeAttribute('aria-describedby');
  };

  let highlightedIndex = -1;
  const getOptions = () => Array.from(list.querySelectorAll('.sg-option'));
  const clearHighlight = () => {
    getOptions().forEach(option => option.classList.remove('sg-focused'));
    trigger.removeAttribute('aria-activedescendant');
    highlightedIndex = -1;
  };
  const highlight = index => {
    const options = getOptions();
    if (!options.length) return;
    highlightedIndex = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => option.classList.toggle('sg-focused', optionIndex === highlightedIndex));
    trigger.setAttribute('aria-activedescendant', options[highlightedIndex].id);
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    options[highlightedIndex].scrollIntoView({ block: 'nearest', behavior });
  };
  const close = (returnFocus = false) => {
    wrapper.classList.remove('sg-open');
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'true');
    clearHighlight();
    if (returnFocus) trigger.focus();
  };
  const open = () => {
    if (select.disabled || !getOptions().length) return;
    wrapper.classList.add('sg-open');
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.setAttribute('aria-hidden', 'false');
    const selectedIndex = getOptions().findIndex(option => option.dataset.value === select.value);
    highlight(selectedIndex >= 0 ? selectedIndex : 0);
  };
  const choose = option => {
    if (!option || select.disabled) return;
    select.value = option.dataset.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
  };

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    if (wrapper.classList.contains('sg-open')) close();
    else open();
  });
  trigger.addEventListener('keydown', event => {
    const isOpen = wrapper.classList.contains('sg-open');
    if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open();
      return;
    }
    if (!isOpen) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight(highlightedIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight(highlightedIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      highlight(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      highlight(getOptions().length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(getOptions()[highlightedIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close();
    }
  });
  list.addEventListener('click', event => {
    const option = event.target.closest('.sg-option');
    if (option) choose(option);
  });
  label?.addEventListener('click', event => {
    event.preventDefault();
    trigger.focus();
  });
  select.addEventListener('invalid', event => {
    event.preventDefault();
    showError();
  });
  select.addEventListener('change', () => {
    select.setCustomValidity('');
    if (select.validity.valid) clearError();
    sincronizarSelectorTesis(wrapper);
  });
  document.addEventListener('click', event => {
    if (!wrapper.contains(event.target)) close();
  });
  sincronizarSelectorTesis(wrapper);
}

function inicializarSelectoresTesis(root = document.getElementById('formCotizacion')) {
  root?.querySelectorAll('select').forEach(select => inicializarSelectorTesis(select));
}

function actualizarSelectoresTesis(root = document.getElementById('formCotizacion')) {
  root?.querySelectorAll('.sg-thesis-select').forEach(sincronizarSelectorTesis);
}

function renderServiciosConfiguradosTesis(catalog) {
  const section = document.getElementById('tesisConfiguredServices');
  const list = document.getElementById('tesisConfiguredServicesList');
  if (!section || !list) return;

  const previous = new Map(Array.from(list.querySelectorAll('[data-thesis-service]')).map(card => [
    card.dataset.thesisService,
    {
      checked: card.querySelector('[data-thesis-service-enabled]')?.checked || false,
      quantity: card.querySelector('[data-thesis-service-quantity]')?.value || '1',
      fields: Object.fromEntries(Array.from(card.querySelectorAll('[data-thesis-service-field]'))
        .map(input => [input.dataset.thesisServiceField, input.value]))
    }
  ]));
  const services = Object.entries(catalog.customServices || {})
    .filter(([, service]) => service?.active && service.placement === 'tesis');

  list.replaceChildren();
  services.forEach(([id, service]) => {
    const saved = previous.get(id) || {};
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'form-section';
    fieldset.dataset.thesisService = id;
    const legend = document.createElement('legend');
    legend.className = 'text-lg font-bold';
    legend.textContent = service.name;
    fieldset.append(legend);

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'sg-switch form-group';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.setAttribute('role', 'switch');
    toggle.dataset.thesisServiceEnabled = '';
    toggle.checked = Boolean(saved.checked);
    const track = document.createElement('span');
    track.className = 'sg-switch-track';
    track.setAttribute('aria-hidden', 'true');
    const thumb = document.createElement('span');
    thumb.className = 'sg-switch-thumb';
    track.append(thumb);
    const toggleText = document.createElement('span');
    toggleText.className = 'sg-switch-label';
    toggleText.textContent = `Agregar ${service.name}`;
    toggleLabel.append(toggle, track, toggleText);
    fieldset.append(toggleLabel);

    if (service.pricingMode === 'unit') {
      const group = document.createElement('div');
      group.className = 'form-group';
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'sg-quantity-input';
      input.min = '1';
      input.step = '1';
      input.required = true;
      input.value = saved.quantity || '';
      input.dataset.thesisServiceQuantity = '';
      label.textContent = service.quantityLabel || 'Cantidad';
      label.htmlFor = `tesis-service-${id}-quantity`;
      input.id = label.htmlFor;
      group.append(label, input);
      fieldset.append(group);
    }

    (service.fields || []).forEach(field => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const label = document.createElement('label');
      const input = field.type === 'select'
        ? document.createElement('select')
        : document.createElement('input');
      input.required = field.required;
      input.dataset.thesisServiceField = field.id;
      input.dataset.thesisServiceFieldLabel = field.label;
      input.id = `tesis-service-${id}-${field.id}`;
      if (field.type === 'select') {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = `Selecciona ${field.label.toLocaleLowerCase()}`;
        placeholder.disabled = field.required;
        placeholder.selected = true;
        input.append(placeholder);
        (field.options || []).forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.id;
          optionElement.textContent = option.label;
          if (field.priceAffectsTotal && Number.isFinite(option.price)) {
            const unit = service.pricingMode === 'unit' ? 'por unidad' : 'por servicio';
            optionElement.dataset.description = `RD$${option.price.toFixed(2)} ${unit}`;
          } else {
            optionElement.dataset.description = `Opción para ${field.label.toLocaleLowerCase()}`;
          }
          input.append(optionElement);
        });
        input.value = saved.fields?.[field.id] || '';
      } else if (field.type === 'number') {
        input.type = 'number';
        input.min = '0';
        input.step = 'any';
      } else {
        input.type = 'text';
        input.maxLength = 300;
      }
      if (field.type !== 'select') input.value = saved.fields?.[field.id] || '';
      label.htmlFor = input.id;
      label.textContent = field.label;
      group.append(label, input);
      fieldset.append(group);
    });

    list.append(fieldset);
  });
  inicializarSelectoresTesis(list);
  section.style.display = services.length ? '' : 'none';
}

function recopilarServiciosConfiguradosTesis() {
  const catalog = window.ServigacoPricing.get();
  const services = [];
  document.querySelectorAll('#tesisConfiguredServicesList [data-thesis-service]').forEach(card => {
    if (!card.querySelector('[data-thesis-service-enabled]')?.checked) return;
    const id = card.dataset.thesisService;
    const service = catalog.customServices?.[id];
    if (!service?.active || service.placement !== 'tesis') return;

    const quantityInput = card.querySelector('[data-thesis-service-quantity]');
    if (quantityInput && !quantityInput.reportValidity()) {
      throw new Error(`Indica una cantidad válida para ${service.name}.`);
    }
    const quantity = quantityInput ? Number(quantityInput.value) : 1;
    const fields = [];
    const selections = {};
    for (const input of card.querySelectorAll('[data-thesis-service-field]')) {
      if (input.required && !input.value.trim()) input.setCustomValidity('Completa este campo.');
      else input.setCustomValidity('');
      if (!input.reportValidity()) {
        throw new Error(`Completa el campo "${input.dataset.thesisServiceFieldLabel}" de ${service.name}.`);
      }
      let value = input.value.trim();
      if (input.tagName === 'SELECT') {
        if (value) selections[input.dataset.thesisServiceField] = value;
        value = input.selectedOptions[0]?.textContent?.trim() || '';
      } else if (input.type === 'number' && value !== '') {
        value = Number(value);
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(`El campo "${input.dataset.thesisServiceFieldLabel}" debe ser un número no negativo.`);
        }
      }
      if (value !== '') fields.push({ label: input.dataset.thesisServiceFieldLabel, value: String(value) });
    }

    const price = window.ServigacoPricing.calculateCustomServicePrice(service, quantity, selections);
    const details = [];
    if (service.pricingMode === 'unit') details.push(`${service.quantityLabel || 'Cantidad'}: ${price.quantity}`);
    details.push(...fields.map(field => `${field.label}: ${field.value}`));
    services.push({
      id,
      name: service.name,
      description: details.join(' · ') || service.name,
      quantity: price.quantity,
      unitPrice: price.unitPrice,
      total: price.total
    });
  });
  return services;
}

function aplicarCatalogoPreciosTesis(catalog) {
  const prices = catalog.tesis;
  PRECIOS = {
    carta: prices.impresion.carta,
    tabloide: prices.impresion.tabloide
  };
  PRECIOS_LEGAL_BN = prices.impresion.legal.bondBN;
  PRECIOS_LEGAL_COLOR = prices.impresion.legal.bondColor;
  PRECIOS_LEGAL_SATINADO = prices.impresion.legal.satinado;
  PRECIOS_LEGAL_HILO_EXTRA = prices.impresion.legal.hiloExtra;
  PRECIO_ITLA_SATINADO = prices.impresion.legal.itlaSatinado;
  TAPA_DURA = prices.tapaDura.colores;
  PRECIO_TAPA_DURA_LEGAL = prices.tapaDura.legal;
  PRECIO_TAPA_DURA_ITLA = prices.tapaDura.itla;
  VINIL = prices.vinil;
  PRECIOS_ENCUADERNADO = prices.encuadernado;
  PRECIOS_SERVICIOS = {
    LOMO: prices.servicios.lomo,
    CD: prices.servicios.cd,
    REDONDEO_MULTIPLO: prices.servicios.redondeoMultiplo
  };
  TIEMPO_ENTREGA = {
    TAPA_DURA: prices.entrega.tapaDura,
    VINIL: prices.entrega.vinil
  };

  renderServiciosConfiguradosTesis(catalog);
  actualizarTablaPreciosTesis();
  if (ultimaCotizacion && datosUltimaCotizacion && !cotizacionHistoricaCargada) {
    calcular({ soloVista: true });
  }
}

window.ServigacoPricing.onChange(aplicarCatalogoPreciosTesis);

function actualizarTablaPreciosTesis() {
  const setText = (id, value) => {
    const cell = document.getElementById(id);
    if (cell) cell.textContent = value;
  };
  const money = value => Number(value).toLocaleString('en-US');
  const carta = PRECIOS.carta;
  const colors = Object.values(TAPA_DURA);

  setText('tesisTableBondBN', `$${money(carta.bond.bn)} / pág.`);
  setText('tesisTableBondColor', `$${money(carta.bond.color)} / pág.`);
  setText('tesisTableHiloBN', `$${money(carta.hilo.bn)} / pág.`);
  setText('tesisTableHiloColor', `$${money(carta.hilo.color)} / pág.`);
  setText('tesisTableSatinadoCarta', `$${money(carta.satinado.precio)} / pág.`);
  setText('tesisTableSatinadoTabloide', `$${money(PRECIOS.tabloide.satinado.precio)} / pág.`);
  setText('tesisTableTapaDuraCarta', `$${money(Math.min(...colors))}–${money(Math.max(...colors))}`);
  setText('tesisTableVinilCarta', `$${money(VINIL.carta)}`);
  setText('tesisTableVinilTabloide', `$${money(VINIL.tabloide)}`);
  setText('tesisTableLomo', `$${money(PRECIOS_SERVICIOS.LOMO)}`);
  setText('tesisTableCD', `$${money(PRECIOS_SERVICIOS.CD)}`);
}


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
  const esEspiral = elementos.tipoEmpastado.value === 'espiral';

  // Mostrar/ocultar secciones según papel
  elementos.bnColorSection.style.display = esSatinado ? 'none' : 'block';
  elementos.soloPaginas.style.display = esSatinado ? 'block' : 'none';

  // Color de tapa SOLO carta/legal + tapa dura
  elementos.colorTapaSection.style.display =
    (esTapaDura && (tamano === 'carta' || tamano === 'legal')) ? 'block' : 'none';

  // Ocultar Lomo si es Espiral y resetear a 'no'
  const lomoSelect = document.getElementById('lomo');
  if (lomoSelect) {
    const lomoGroup = lomoSelect.closest('.form-group');
    if (lomoGroup) {
      if (esEspiral) {
        lomoGroup.style.display = 'none';
        lomoSelect.value = 'no';
      } else {
        lomoGroup.style.display = 'block';
      }
    }
  }
  actualizarSelectoresTesis();
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
  actualizarSelectoresTesis();
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

  let precio;
  if (elementos.itlaCheckbox?.checked) {
    precio = PRECIO_ITLA_SATINADO;
  } else if (elementos.tamano.value === 'legal') {
    precio = obtenerPrecioRango(PRECIOS_LEGAL_SATINADO, paginas);
  } else {
    precio = PRECIOS[elementos.tamano.value].satinado.precio;
  }
  
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

  let precioBN, precioColor;
  const tamano = elementos.tamano.value;
  
  if (tamano === 'legal') {
    const baseBN = obtenerPrecioRango(PRECIOS_LEGAL_BN, bn);
    const baseColor = obtenerPrecioRango(PRECIOS_LEGAL_COLOR, color);
    
    if (elementos.papel.value === 'hilo') {
      precioBN = baseBN + 2;
      precioColor = baseColor + 3;
    } else {
      precioBN = baseBN;
      precioColor = baseColor;
    }
  } else {
    const precios = PRECIOS[tamano][elementos.papel.value];
    precioBN = precios.bn;
    precioColor = precios.color;
  }
  
  return {
    impresion: bn * precioBN + color * precioColor,
    detalleImpresion: `${bn} B/N + ${color} Color`
  };
}

/**
 * Calcula el costo del empastado
 * @param {number} tomos - Cantidad de tomos
 * @returns {Object} {empastado, tipoEmp, colorTapa}
 */
function calcularEmpastado(tomos, totalPaginas) {
  const tipoEmp = elementos.tipoEmpastado.value;
  const colorTapa = tipoEmp === 'tapa_dura' 
    ? document.getElementById('colorTapa').value 
    : '';

  let costoUnitario = 0;
  if (tipoEmp === 'vinil') {
    costoUnitario = VINIL[elementos.tamano.value];
  } else if (tipoEmp === 'espiral') {
    costoUnitario = calcularPrecioEncuadernado(totalPaginas);
  } else {
    costoUnitario = elementos.tamano.value === 'legal' ? PRECIO_TAPA_DURA_LEGAL : TAPA_DURA[colorTapa];
    if (elementos.itlaCheckbox?.checked) {
      costoUnitario = PRECIO_TAPA_DURA_ITLA;
    }
  }

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
        ${window.servigacoIcon('book-2')} Ejemplar – Tapa ${nombreColor(colorTapa)}
      </div>
      <div class="bloque-ejemplar-img">
        <img src="${src}" alt="Ejemplar color ${nombreColor(colorTapa)}" width="1024" height="1024">
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
async function calcular({ soloVista = false } = {}) {
  try {

    const serviciosConfigurados = recopilarServiciosConfiguradosTesis();
    if (!soloVista) cotizacionHistoricaCargada = false;
    const idCotizacion = soloVista && datosUltimaCotizacion
      ? datosUltimaCotizacion.idCotizacion
      : generarIdCotizacion();
    const fecha = soloVista && datosUltimaCotizacion
      ? datosUltimaCotizacion.fecha
      : fechaFormateada();

    const tomos = Math.max(1, obtenerValorNumerico('tomos', 1));
    
    // Cálculo de impresión
    const { impresion, detalleImpresion } = calcularImpresion();
    
    // Cálculo de empastado/encuadernación
    const esSatinado = elementos.papel.value === 'satinado';
    const totalPaginas = esSatinado ? obtenerValorNumerico('paginas') : (obtenerValorNumerico('bn') + obtenerValorNumerico('color'));
    const { empastado, tipoEmp, colorTapa, costoUnitario } = calcularEmpastado(tomos, totalPaginas);
    
    // Servicios adicionales
    const { lomoVal, cdVal, lomo, cd, cantidadCd } = calcularServiciosAdicionales(tomos);
    
    // Total
    const total = impresion * tomos + empastado + lomoVal + cdVal
      + serviciosConfigurados.reduce((sum, service) => sum + service.total, 0);
    const totalRedondeado = redondearA5(total);
    
    // Guardar datos completos para la generación de PDF
    datosUltimaCotizacion = {
      itlaAplicado: elementos.itlaCheckbox?.checked,
      esSatinado,
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
      serviciosConfigurados,
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
if (serviciosConfigurados.length) {
  datosParaGuardar.detalle += `\n${serviciosConfigurados.map(service => `➕ ${service.name} - RD$${service.total.toFixed(2)}`).join('\n')}`;
}
ultimaCotizacion = generarHTMLCotizacion(datosUltimaCotizacion);


    
    elementos.resultado.innerHTML = ultimaCotizacion;
    elementos.resultado.style.display = 'block';
    if (!soloVista) mostrarNotificacion('Cotización calculada exitosamente', 'success');

    if (!soloVista) {
      const datosDashboard = {
        fecha: new Date().toISOString(),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        tipo: "Tesis",
        nombre: idCotizacion,
        total: totalRedondeado.toFixed(2),
        descripcion: `Cotización automática - ${tomos} tomos`
      };

      try {
        await db.ref("cotizaciones").push(datosDashboard);
        console.log("Tesis guardada en dashboard");
      } catch (error) {
        console.error("Error al guardar tesis:", error);
      }
    }
    
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
      <img src="${SERVIGACO_ASSET_URL('logo.webp')}" class="logo" alt="Logo ServiGaco" width="384" height="297">
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
  const filasServicios = (datos.serviciosConfigurados || []).map(generarFilaServicioConfigurado).join('');

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
          ${filasServicios}
        </tbody>
      </table>
    </div>
  `;
}

function escaparHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function generarFilaServicioConfigurado(service) {
  return `
    <tr>
      <td><strong>${escaparHTML(service.name)}</strong></td>
      <td>${escaparHTML(service.description)}</td>
      <td class="center">${service.quantity}</td>
      <td class="right">RD$${formatearMonto(service.unitPrice)}</td>
      <td class="right">RD$${formatearMonto(service.total)}</td>
    </tr>
  `;
}

/**
 * Genera fila de impresión
 * @param {Object} datos
 * @returns {string}
 */
function generarFilaImpresion(datos) {
  const badgeItla = (datos.itlaAplicado && datos.esSatinado) ? ' <span style="background:#4f46e5;color:white;padding:2px 6px;border-radius:4px;font-size:0.75rem;font-weight:bold;vertical-align:middle;margin-left:4px;">ITLA</span>' : '';
  return `
    <tr>
      <td><strong>Impresión${badgeItla}</strong></td>
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
  let detalle = 'Vinil';
  let concepto = 'Empastado';
  const badgeItla = (datos.itlaAplicado && datos.tipoEmp === 'tapa_dura') ? ' <span style="background:#4f46e5;color:white;padding:2px 6px;border-radius:4px;font-size:0.75rem;font-weight:bold;vertical-align:middle;margin-left:4px;">ITLA</span>' : '';
  if (datos.tipoEmp === 'tapa_dura') {
    detalle = `Tapa dura (${nombreColor(datos.colorTapa)})${badgeItla}`;
  } else if (datos.tipoEmp === 'espiral') {
    detalle = 'Encuadernado Espiral';
    concepto = 'Encuadernado';
  }

  return `
    <tr>
      <td><strong>${concepto}</strong></td>
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
  if (tipoEmp === 'espiral') {
    return `
      <div class="tiempo-entrega">
        ${window.servigacoIcon('history')} Tiempo de entrega: encuadernado espiral se entrega de inmediato.
      </div>
    `;
  }

  const tiempo = tipoEmp === 'tapa_dura' 
    ? TIEMPO_ENTREGA.TAPA_DURA 
    : TIEMPO_ENTREGA.VINIL;
    
  return `
    <div class="tiempo-entrega">
      ${window.servigacoIcon('history')} Tiempo de entrega: en tapa dura ${tiempo}, si es apartir de las 12:00 PM se entrega al otro dia / ${TIEMPO_ENTREGA.VINIL} vinil.
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
      <link rel="stylesheet" href="icons.css">
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
            <img src="${SERVIGACO_ASSET_URL('logo.webp')}" class="logo" alt="Logo ServiGaco" width="384" height="297" />
            <h1>Cotización de Tesis</h1>
            <div class="header-divider"></div>
            <p>ID: ${datos.idCotizacion}</p>
            <div class="header-badge">
              ${window.servigacoIcon('calendar')} ${datos.fecha} | ${window.servigacoIcon('check')} Presupuesto Válido
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
  const filename = nombreArchivoPDF(datos.idCotizacion, datos.colorTapa, datos.tipoEmp);
  const html = generarHTMLParaImprimir(datos); // Reutilizamos la función de generación de HTML

  const apiUrl = window.location.port === '5500' ? 'http://localhost:3000/generar-pdf' : '/generar-pdf';
  const response = await fetch(apiUrl, {
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
  if (isProcessingAction) {
    return mostrarNotificacion('Espere a que la acción actual termine.', 'warning');
  }
  if (!ultimaCotizacion || !datosUltimaCotizacion) {
    return mostrarNotificacion('Calcule primero la cotización', 'warning');
  }

  isProcessingAction = true;
  const btn = elementos.btnGenerar;
  const originalBtnHTML = btn.innerHTML;
  btn.disabled = true;
  try {
    // 1. Generamos el HTML optimizado para impresión, que es autocontenido.
    const htmlCompleto = generarHTMLParaImprimir(datosUltimaCotizacion);

    // 2. Abrimos una nueva ventana para la impresión.
    const ventanaImpresion = window.open('', 'Imprimir Cotización', 'height=800,width=1200');
    
    if (!ventanaImpresion) {
        throw new Error('El navegador bloqueó la ventana emergente. Por favor, permite los popups para imprimir.');
    }

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
  } finally {
    isProcessingAction = false;
    btn.disabled = false;
    btn.innerHTML = originalBtnHTML;
  }
}


/**
 * Genera y descarga el PDF usando el backend con Puppeteer
 */
async function generarPDFDesdeBackend() {
  if (isProcessingAction) {
    return mostrarNotificacion('Espere a que la acción actual termine.', 'warning');
  }
  if (!ultimaCotizacion || !datosUltimaCotizacion) {
    mostrarNotificacion('Primero genera la cotización', 'warning');
    return;
  }

  isProcessingAction = true;
  const btn = document.getElementById('btnDescargarPdf');
  const originalBtnHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `${window.servigacoIcon('settings')} Generando...`;
  btn.querySelector('.ti').classList.add('animate-spin');
  
  try {
    const datos = datosUltimaCotizacion;
    const filename = nombreArchivoPDF(datos.idCotizacion, datos.colorTapa, datos.tipoEmp);

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
    isProcessingAction = false;
    btn.disabled = false;
    btn.innerHTML = originalBtnHTML;
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

  // Mantener la cantidad de tomos vacía hasta que se introduzca.
  const tomos = document.getElementById('tomos');
  if (tomos) tomos.value = '';

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
    alert("ATENCIÓN: Estás abriendo el archivo directamente (file://).\n\nPara que la generación de PDF funcione, debes usar el servidor local.\n\nEjecuta 'node server.js' y abre http://localhost:3000");
  }

  // Establecer valor por defecto
  elementos.tipoEmpastado.value = 'tapa_dura';
  
  // Cargar datos guardados (si existen)
  cargarTesisLocalStorage();
  inicializarSelectoresTesis();
  
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
  
  // --- EVENTOS DASHBOARD Y AUTH (NUEVO) ---
  const btnDashboard = document.getElementById('btnDashboard');
  if (btnDashboard) btnDashboard.addEventListener('click', abrirModalDashboard);

  // --- EVENTO FILTRO DASHBOARD ---
  const btnFiltrarDash = document.getElementById('btnFiltrarDashboard');
  if (btnFiltrarDash) btnFiltrarDash.addEventListener('click', cargarDatosDashboard);

  const btnAuthNav = document.getElementById('btnAuthNav');
  if (btnAuthNav) btnAuthNav.addEventListener('click', manejarClickAuth);

  document.getElementById('formLogin')?.addEventListener('submit', procesarLogin);
  document.getElementById('btnCerrarLogin')?.addEventListener('click', () => document.getElementById('modalLogin').classList.add('hidden'));
  document.getElementById('btnCerrarDashboard')?.addEventListener('click', () => document.getElementById('modalDashboard').classList.add('hidden'));
  document.getElementById('btnFiltrarDashboard')?.addEventListener('click', cargarDatosDashboard);

  auth.onAuthStateChanged(actualizarIconoAuth);

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
    isProcessingAction = false; // Liberar si se cancela
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
  const iconoToast = {
    success: 'circle-check',
    error: 'circle-x',
    warning: 'alert-triangle',
    info: 'info-circle'
  }[tipo] || 'info-circle';
  toast.innerHTML = `
    <span class="toast-icon">${window.servigacoIcon(iconoToast)}</span>
    <span class="toast-message">${window.servigacoReplaceIconGlyphs(mensaje)}</span>
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
  if (isProcessingAction) {
    return mostrarNotificacion('Espere a que la acción actual termine.', 'warning');
  }
  if (cotizacionHistoricaCargada) {
    return mostrarNotificacion('Esta cotización es histórica. Calcula una nueva para guardar los precios vigentes.', 'warning');
  }
  if (!ultimaCotizacion) {
    calcular();
    if (!ultimaCotizacion) return;
  }

  isProcessingAction = true; // Bloqueamos otras acciones

  // ABRIR MODAL EN LUGAR DE PROMPT
  const modal = document.getElementById('modalGuardarTesis');
  const input = document.getElementById('inputNombreTesis');
  
  if (modal && input) {
    input.value = "Cliente Tesis"; // Valor por defecto
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
    // isProcessingAction se libera en confirmarGuardarTesis o al cerrar el modal
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
    itlaAplicado: elementos.itlaCheckbox?.checked || false,
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
    inputs: inputs,
    snapshotPrecio: datosUltimaCotizacion
  };

  try {
    const firebaseRef = await db.ref("cotizaciones").push(paqueteDeDatos);
    mostrarNotificacion(`✅ Tesis guardada correctamente`, "success");

    // ── Sincronización con Notion (segundo plano) ──────────────────────────────
    // Si NotionSync no está configurado o falla, la app sigue funcionando normal.
    if (window.NotionSync) {
      const datosNotion = {
        nombre:        nombre,
        idCotizacion:  datosUltimaCotizacion?.idCotizacion || paqueteDeDatos.nombre,
        total:         paqueteDeDatos.total,
        tomos:         inputs.tomos,
        tipoEmpastado: inputs.tipoEmpastado,
        colorTapa:     inputs.colorTapa,
        tamano:        inputs.tamano,
        papel:         inputs.papel,
        lomo:          inputs.lomo,
        cantidadCd:    inputs.cantidadCd,
        itlaAplicado:  elementos.itlaCheckbox?.checked || false,
        fecha:         paqueteDeDatos.fecha,
        firebaseId:    firebaseRef.key
      };
      window.NotionSync.syncTesis(datosNotion, firebaseRef.key);
    }
    // ── Fin Notion ─────────────────────────────────────────────────────────────

  } catch (error) {
    console.error("❌ Error:", error);
    mostrarNotificacion("Error al guardar: " + error.message, "error");
  } finally {
    isProcessingAction = false; // Liberar bloqueo
  }
}

async function abrirModalCotizaciones() {
  const container = document.getElementById('listaCotizacionesGuardadas');
  if (container) container.innerHTML = `<div class="text-center py-10"><p class="text-xl animate-pulse">${window.servigacoIcon('refresh')} Cargando desde Base de Datos...</p></div>`;
  
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
  isProcessingAction = false; // Liberar si se cierra el modal sin guardar
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
    const icono = window.servigacoIcon(esTesis ? 'school' : 'file-text');
    
    // Solo permitimos cargar si es Tesis, o borrar cualquiera
    const btnCargar = esTesis 
      ? `<button onclick="cargarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none py-2 px-3 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm whitespace-nowrap">${window.servigacoIcon('folder')} Cargar</button>`
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
          <button onclick="eliminarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none py-2 px-3 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm whitespace-nowrap">${window.servigacoIcon('trash')} Borrar</button>
        </div>
      </div>
    `;
  }).join('');
}

function cargarCotizacionGuardada(id) {
  const cotizacion = todasLasCotizaciones.find(c => c.id === id);
  if (cotizacion && cotizacion.inputs) {
    cotizacionHistoricaCargada = true;
    const d = cotizacion.inputs;
    
    if (d.tamano) elementos.tamano.value = d.tamano;
    if (d.papel) elementos.papel.value = d.papel;
    if (d.bn) document.getElementById('bn').value = d.bn;
    if (d.color) document.getElementById('color').value = d.color;
    if (d.paginas) document.getElementById('paginas').value = d.paginas;
    if (d.tomos) document.getElementById('tomos').value = d.tomos;
    if (d.tipoEmpastado) elementos.tipoEmpastado.value = d.tipoEmpastado;
    if (d.colorTapa) document.getElementById('colorTapa').value = d.colorTapa;
    if (typeof d.itlaAplicado === 'boolean' && elementos.itlaCheckbox) {
      elementos.itlaCheckbox.checked = d.itlaAplicado;
    }
    if (d.lomo) document.getElementById('lomo').value = d.lomo;
    if (d.llevaCd) elementos.llevaCd.value = d.llevaCd;
    if (d.cantidadCd) document.getElementById('cantidadCd').value = d.cantidadCd;

    actualizarVista();
    toggleSeccionCD();
    datosParaGuardar = null;
    if (cotizacion.snapshotPrecio) {
      datosUltimaCotizacion = cotizacion.snapshotPrecio;
      ultimaCotizacion = generarHTMLCotizacion(datosUltimaCotizacion);
      elementos.resultado.innerHTML = ultimaCotizacion;
      elementos.resultado.style.display = 'block';
    } else {
      datosUltimaCotizacion = null;
      ultimaCotizacion = '';
      elementos.resultado.replaceChildren();
      const historical = document.createElement('div');
      const title = document.createElement('h3');
      const description = document.createElement('p');
      const amount = document.createElement('p');
      const note = document.createElement('p');
      historical.className = 'rounded-xl border border-amber-200 bg-amber-50 p-5 text-gray-800';
      title.className = 'font-bold';
      title.textContent = `Cotización histórica: ${cotizacion.nombre}`;
      description.textContent = cotizacion.descripcion || 'Sin descripción guardada.';
      amount.className = 'mt-3 text-lg font-bold';
      amount.textContent = `Total histórico: RD$${formatearMonto(Number(cotizacion.total || 0))}`;
      note.className = 'mt-2 text-sm';
      note.textContent = 'Este importe guardado se conserva; pulsa Calcular para crear una cotización con los precios vigentes.';
      historical.append(title, description, amount, note);
      elementos.resultado.append(historical);
      elementos.resultado.style.display = 'block';
    }
    cotizacionHistoricaCargada = true;
    cerrarModalCotizaciones();
    mostrarNotificacion(`Tesis de "${cotizacion.nombre}" cargada`, 'success');
  }
}

// ============================================
// 📊 LÓGICA DEL DASHBOARD (TESIS)
// ============================================

async function abrirModalDashboard() {
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
  const elVentasPeriodo = document.getElementById('dashVentasPeriodo');
  const elTotalTesis = document.getElementById('dashTotalTesis');
  const elTotalFacturas = document.getElementById('dashTotalFacturas');
  const elTotalMontoTesis = document.getElementById('dashTotalMontoTesis');
  const listaTesis = document.getElementById('dashListaTesis');
  const listaFacturas = document.getElementById('dashListaFacturas');
  
  const fechaInicio = document.getElementById('dashFechaInicio').value;
  const fechaFin = document.getElementById('dashFechaFin').value;

  // Reset UI
  elVentasHoy.textContent = '...';
  elVentasMes.textContent = '...';
  elVentasPeriodo.textContent = '...';
  elTotalMontoTesis.textContent = '...';
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

    // Calcular total monto de tesis
    let totalMontoTesis = 0;
    tesisArray.forEach(t => totalMontoTesis += parseFloat(t.total || 0));

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
    elVentasMes.textContent = `RD$${totalMes.toLocaleString('es-DO', {minimumFractionDigits: 2})}`;
    elVentasPeriodo.textContent = `RD$${totalPeriodo.toLocaleString('es-DO', {minimumFractionDigits: 2})}`;
    elTotalTesis.textContent = tesisArray.length;
    elTotalFacturas.textContent = countFacturasPeriodo;
    elTotalMontoTesis.textContent = `RD$${totalMontoTesis.toLocaleString('es-DO', {minimumFractionDigits: 2})}`;

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
// 🔐 SEGURIDAD Y AUTH
// ============================================

function verificarPermisoAdmin() {
  if (!ACTIVAR_SEGURIDAD) return true;
  const user = auth.currentUser;
  if (user) return true;
  
  document.getElementById('modalLogin').classList.remove('hidden');
  mostrarNotificacion('🔒 Acceso restringido', 'warning');
  return false;
}

function manejarClickAuth() {
  const user = auth.currentUser;
  if (user) {
    if (!confirm("¿Cerrar sesión?")) return;
    auth.signOut().then(() => {
      mostrarNotificacion('Sesión cerrada', 'info');
      document.getElementById('modalDashboard').classList.add('hidden');
    });
  } else {
    document.getElementById('modalLogin').classList.remove('hidden');
  }
}

function actualizarIconoAuth(user) {
  const btn = document.getElementById('btnAuthNav');
  if (!btn) return;

  if (user) {
    const nombre = user.email ? user.email.split('@')[0] : 'Admin';
    btn.innerHTML = `<span class="mr-1 text-lg">${window.servigacoIcon('logout')}</span><span class="font-bold">Salir (${nombre})</span>`;
    btn.className = "flex items-center text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-3 py-2 mr-2 transition-all shadow-md";
  } else {
    btn.innerHTML = `<span id="iconAuth">${window.servigacoIcon('lock')}</span>`;
    btn.className = "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all";
  }
}

async function procesarLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('usuarioLogin').value.trim();
  const pass = document.getElementById('passwordLogin').value;
  const email = `${usuario}@servigaco.com`;

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    document.getElementById('modalLogin').classList.add('hidden');
    mostrarNotificacion('¡Bienvenido de nuevo!', 'success');
    document.getElementById('formLogin').reset();
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Credenciales incorrectas', 'error');
  }
}

// ============================================
// 📄 ANALIZADOR DE PDF - FUNCIONES GLOBALES
// ============================================

function abrirModalAnalizadorPDF() {
  document.getElementById('modalAnalizadorPDF').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function cerrarModalAnalizadorPDF() {
  const modal = document.getElementById('modalAnalizadorPDF');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}
