// Framework-agnóstico: funciona igual en React, Vue o JS plano.
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || '';
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 segundos

let heartbeatTimer = null;
let currentPage = null;

async function sendTrack(page) {
  currentPage = page;
  try {
    await fetch(`${API_BASE}/api/visitors/track`, {
      method: 'POST',
      credentials: 'include', // necesario para que viaje la cookie anónima
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
    });
  } catch (err) {
    // La analítica nunca debe romper la app si falla la red.
    console.warn('No se pudo registrar la visita:', err);
  }
}

async function sendHeartbeat() {
  try {
    await fetch(`${API_BASE}/api/visitors/heartbeat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: currentPage }),
    });
  } catch (err) {
    console.warn('Heartbeat de visitante falló:', err);
  }
}

/**
 * Llama esto una vez al cargar la app y cada vez que cambie de página/ruta.
 * page: nombre legible de la página, ej. "Inicio", "Cotizador".
 */
export function trackPageView(page) {
  sendTrack(page);

  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }
}

export function stopVisitorTracking() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
