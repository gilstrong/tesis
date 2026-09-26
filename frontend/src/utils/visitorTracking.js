// Framework-agnóstico: funciona en React, Vue o JS plano.
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || '';
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 segundos

let heartbeatTimer = null;
let currentPage = null;
let lastTrackTime = 0;
let lastTrackPage = '';

async function sendTrack(page) {
  currentPage = page;
  const now = Date.now();
  if (page === lastTrackPage && now - lastTrackTime < 2000) return;
  lastTrackTime = now;
  lastTrackPage = page;

  try {
    await fetch(`${API_BASE}/api/visitors/track`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
    });
  } catch (err) {
    console.warn('No se pudo registrar la visita:', err);
  }
}

async function sendHeartbeat() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

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

export function sendDisconnect() {
  const url = `${API_BASE}/api/visitors/disconnect`;
  const payload = JSON.stringify({ page: currentPage });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } else if (typeof fetch !== 'undefined') {
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

export function trackPageView(page) {
  sendTrack(page);

  if (!heartbeatTimer && typeof setInterval !== 'undefined') {
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }
}

export function stopVisitorTracking() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', sendDisconnect);
  window.addEventListener('beforeunload', sendDisconnect);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendDisconnect();
    } else if (document.visibilityState === 'visible' && currentPage) {
      sendTrack(currentPage);
    }
  });
}
