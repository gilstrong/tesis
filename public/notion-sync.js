// ============================================================
// notion-sync.js — Cliente frontend de sincronización Notion
// ServiGaco · Llama al backend propio, NUNCA a Notion directamente
// ============================================================
// Este script NO contiene tokens ni credenciales.
// Toda comunicación va a /notion/*, que es nuestro propio backend.
// ============================================================

'use strict';

// ── URL base del backend ──────────────────────────────────────────────────────
// Si el puerto es 5500 (Live Server), apunta al backend en :3000
const NOTION_API_BASE = window.location.port === '5500'
  ? 'http://localhost:3000'
  : '';

// ── Estado de sincronización ─────────────────────────────────────────────────
const NotionSync = {

  /**
   * Sincroniza una cotización de tesis con Notion.
   * NO lanza excepciones: si Notion falla, solo registra en consola.
   * @param {Object} datos - Datos de la cotización
   * @param {string|null} firebaseId - ID de Firebase (para trazabilidad)
   * @param {string|null} notionPageId - ID de página Notion si ya existe
   * @returns {Promise<{success: boolean, notionPageId?: string}>}
   */
  async syncTesis(datos, firebaseId = null, notionPageId = null) {
    try {
      const payload = {
        datos: { ...datos, firebaseId },
        notionPageId
      };
      const res = await fetch(`${NOTION_API_BASE}/notion/sync/tesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        console.log(`✅ [Notion] Tesis sincronizada → ${json.notionPageId}`);
      } else {
        console.warn(`⚠️ [Notion] Error al sincronizar tesis: ${json.error}`);
      }
      return json;
    } catch (err) {
      console.warn(`⚠️ [Notion] No se pudo sincronizar tesis (la app sigue funcionando):`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Sincroniza una cotización general con Notion.
   * @param {Object} datos
   * @param {string|null} firebaseId
   * @param {string|null} notionPageId
   */
  async syncGeneral(datos, firebaseId = null, notionPageId = null) {
    try {
      const payload = {
        datos: { ...datos, firebaseId },
        notionPageId
      };
      const res = await fetch(`${NOTION_API_BASE}/notion/sync/general`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        console.log(`✅ [Notion] Cotización general sincronizada → ${json.notionPageId}`);
      } else {
        console.warn(`⚠️ [Notion] Error al sincronizar cotización general: ${json.error}`);
      }
      return json;
    } catch (err) {
      console.warn(`⚠️ [Notion] No se pudo sincronizar cotización general:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Sincroniza una factura con Notion.
   * @param {Object} datos
   * @param {string|null} firebaseId
   * @param {string|null} notionPageId
   */
  async syncFactura(datos, firebaseId = null, notionPageId = null) {
    try {
      const payload = {
        datos: { ...datos, firebaseId },
        notionPageId
      };
      const res = await fetch(`${NOTION_API_BASE}/notion/sync/factura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        console.log(`✅ [Notion] Factura sincronizada → ${json.notionPageId}`);
      } else {
        console.warn(`⚠️ [Notion] Error al sincronizar factura: ${json.error}`);
      }
      return json;
    } catch (err) {
      console.warn(`⚠️ [Notion] No se pudo sincronizar factura:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Archiva una página en Notion (en lugar de eliminarla).
   * @param {string} notionPageId
   */
  async archivar(notionPageId) {
    if (!notionPageId) return { success: false };
    try {
      const res = await fetch(`${NOTION_API_BASE}/notion/archivar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionPageId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        console.log(`📦 [Notion] Página archivada: ${notionPageId}`);
      }
      return json;
    } catch (err) {
      console.warn(`⚠️ [Notion] No se pudo archivar la página:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Verifica el estado de la conexión con Notion.
   * @returns {Promise<{connected: boolean, user?: string, error?: string}>}
   */
  async checkStatus() {
    try {
      const res = await fetch(`${NOTION_API_BASE}/notion/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }
};

// Exportar para uso global en el browser
window.NotionSync = NotionSync;
