// ============================================================
// notionService.js — Servicio de integración con Notion API
// ServiGaco · Integración segura vía backend
// ============================================================
// Las credenciales NUNCA salen del servidor.
// Este módulo es llamado exclusivamente desde server.js.
// ============================================================

'use strict';

const { Client } = require('@notionhq/client');

// ── Cliente Notion (se inicializa con el token del .env) ─────────────────────
let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.NOTION_TOKEN) {
      throw new Error('NOTION_TOKEN no está configurado en las variables de entorno.');
    }
    _client = new Client({ auth: process.env.NOTION_TOKEN });
  }
  return _client;
}

// ── IDs de bases de datos (desde .env) ──────────────────────────────────────
function getDBId(tipo) {
  const map = {
    tesis:   process.env.NOTION_DB_TESIS_ID,
    general: process.env.NOTION_DB_GENERAL_ID,
    facturas: process.env.NOTION_DB_FACTURAS_ID
  };
  const id = map[tipo];
  if (!id) throw new Error(`NOTION_DB_${tipo.toUpperCase()}_ID no está configurado en .env`);
  return id;
}

// ── Helpers de propiedades Notion ─────────────────────────────────────────────

function propTitle(text) {
  return { title: [{ text: { content: String(text || '').slice(0, 2000) } }] };
}

function propRichText(text) {
  return { rich_text: [{ text: { content: String(text || '').slice(0, 2000) } }] };
}

function propNumber(value) {
  const n = parseFloat(value);
  return { number: isNaN(n) ? 0 : n };
}

function propSelect(value) {
  if (!value) return { select: null };
  return { select: { name: String(value).slice(0, 100) } };
}

function propCheckbox(value) {
  return { checkbox: Boolean(value) };
}

function propDate(dateStr) {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return { date: { start: new Date().toISOString() } };
    return { date: { start: d.toISOString() } };
  } catch {
    return { date: { start: new Date().toISOString() } };
  }
}

function propStatus(name) {
  // Notion status field — el nombre debe coincidir con los que creaste en la DB
  return { status: { name: String(name || 'Sincronizado') } };
}

// ── Función de prueba de conexión ─────────────────────────────────────────────

/**
 * Verifica que el token de Notion es válido consultando el usuario actual.
 * @returns {Promise<{connected: boolean, user?: string, error?: string}>}
 */
async function testConnection() {
  try {
    const client = getClient();
    const resp = await client.users.me();
    return {
      connected: true,
      user: resp.name || resp.id,
      type: resp.type
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message || 'Error desconocido al conectar con Notion'
    };
  }
}

// ── Sincronizar Cotización de TESIS ──────────────────────────────────────────

/**
 * Crea o actualiza una página en la base de datos de Tesis en Notion.
 * @param {Object} datos - Datos de la cotización de tesis.
 * @param {string|null} notionPageId - Si existe, actualiza. Si no, crea.
 * @returns {Promise<{success: boolean, notionPageId?: string, error?: string}>}
 */
async function syncTesis(datos, notionPageId = null) {
  try {
    const client = getClient();
    const dbId = getDBId('tesis');

    const properties = {
      'Nombre':          propTitle(datos.nombre || 'Sin nombre'),
      'ID Cotización':   propRichText(datos.idCotizacion || datos.nombre),
      'Total':           propNumber(datos.total),
      'Tomos':           propNumber(datos.tomos || 1),
      'Tipo Empastado':  propSelect(formatarSelect(datos.tipoEmpastado)),
      'Color Tapa':      propSelect(formatarSelect(datos.colorTapa)),
      'Tamaño Papel':    propSelect(formatarSelect(datos.tamano)),
      'Tipo Papel':      propSelect(formatarSelect(datos.papel)),
      'Lomo':            propCheckbox(datos.lomo === 'si' || datos.lomo === true),
      'CD':              propNumber(datos.cantidadCd || 0),
      'ITLA':            propCheckbox(datos.itlaAplicado === true),
      'Fecha':           propDate(datos.fecha),
      'Estado Sync':     propStatus('Sincronizado'),
      'Firebase ID':     propRichText(datos.firebaseId || '')
    };

    let page;
    if (notionPageId) {
      // Actualizar página existente
      page = await client.pages.update({
        page_id: notionPageId,
        properties
      });
    } else {
      // Crear nueva página
      page = await client.pages.create({
        parent: { database_id: dbId },
        properties
      });
    }

    return { success: true, notionPageId: page.id };
  } catch (err) {
    console.error('[Notion] Error sincronizando tesis:', err.message);
    return { success: false, error: err.message || 'Error Notion' };
  }
}

// ── Sincronizar Cotización GENERAL ───────────────────────────────────────────

/**
 * Crea o actualiza una página en la base de datos de Cotizaciones Generales.
 * @param {Object} datos
 * @param {string|null} notionPageId
 * @returns {Promise<{success: boolean, notionPageId?: string, error?: string}>}
 */
async function syncGeneral(datos, notionPageId = null) {
  try {
    const client = getClient();
    const dbId = getDBId('general');

    const properties = {
      'Nombre Cliente':   propTitle(datos.nombre || datos.nombreCliente || 'Sin nombre'),
      'ID Cotización':    propRichText(datos.idCotizacion || ''),
      'Total':            propNumber(datos.total),
      'Servicios':        propRichText(datos.descripcion || datos.detalle || ''),
      'Fecha':            propDate(datos.fecha),
      'Estado Sync':      propStatus('Sincronizado'),
      'Firebase ID':      propRichText(datos.firebaseId || '')
    };

    let page;
    if (notionPageId) {
      page = await client.pages.update({ page_id: notionPageId, properties });
    } else {
      page = await client.pages.create({
        parent: { database_id: dbId },
        properties
      });
    }

    return { success: true, notionPageId: page.id };
  } catch (err) {
    console.error('[Notion] Error sincronizando cotización general:', err.message);
    return { success: false, error: err.message || 'Error Notion' };
  }
}

// ── Sincronizar FACTURA ──────────────────────────────────────────────────────

/**
 * Crea o actualiza una página en la base de datos de Facturas.
 * @param {Object} datos
 * @param {string|null} notionPageId
 * @returns {Promise<{success: boolean, notionPageId?: string, error?: string}>}
 */
async function syncFactura(datos, notionPageId = null) {
  try {
    const client = getClient();
    const dbId = getDBId('facturas');

    const properties = {
      'Razón Social':       propTitle(datos.razon_social || datos.nombre || 'Sin nombre'),
      'RNC':                propRichText(datos.rnc_cliente || datos.rnc || ''),
      'NCF':                propRichText(datos.ncf || ''),
      'Total':              propNumber(datos.total),
      'ITBIS':              propNumber(datos.itbis || datos.impuesto || 0),
      'Subtotal':           propNumber(datos.subtotal || 0),
      'Tipo NCF':           propSelect(datos.tipo_ncf || datos.tipoNcf || ''),
      'Estado':             propSelect(datos.estado === 'anulada' ? 'Anulada' : 'Activa'),
      'Fecha Facturación':  propDate(datos.fecha_facturacion || datos.fecha),
      'Estado Sync':        propStatus('Sincronizado'),
      'Firebase ID':        propRichText(datos.firebaseId || '')
    };

    let page;
    if (notionPageId) {
      page = await client.pages.update({ page_id: notionPageId, properties });
    } else {
      page = await client.pages.create({
        parent: { database_id: dbId },
        properties
      });
    }

    return { success: true, notionPageId: page.id };
  } catch (err) {
    console.error('[Notion] Error sincronizando factura:', err.message);
    return { success: false, error: err.message || 'Error Notion' };
  }
}

// ── Archivar (en lugar de eliminar) ──────────────────────────────────────────

/**
 * Marca una página de Notion como archivada (sin eliminarla).
 * Esto preserva el historial cuando se elimina un registro en Firebase.
 * @param {string} notionPageId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function archivarPagina(notionPageId) {
  try {
    if (!notionPageId) return { success: false, error: 'No se proporcionó notionPageId' };
    const client = getClient();
    await client.pages.update({
      page_id: notionPageId,
      archived: true
    });
    return { success: true };
  } catch (err) {
    console.error('[Notion] Error archivando página:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Helper: formatear selects ─────────────────────────────────────────────────

function formatarSelect(valor) {
  if (!valor) return '';
  return valor
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  testConnection,
  syncTesis,
  syncGeneral,
  syncFactura,
  archivarPagina
};
