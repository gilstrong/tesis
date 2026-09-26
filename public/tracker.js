/**
 * ServiGaco - Sistema de Monitoreo de Visitantes
 * Registra visitas de páginas y pulsos de presencia (heartbeat)
 */
(function() {
  'use strict';

  // ID anónimo persistente en cliente como respaldo a la cookie HTTP
  let visitorId = localStorage.getItem('servigaco_visitor_id');
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('servigaco_visitor_id', visitorId);
  }

  const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 segundos
  let heartbeatTimer = null;
  let currentPage = document.title || window.location.pathname;

  async function sendTrack(pageName) {
    currentPage = pageName || document.title || window.location.pathname;
    try {
      await fetch('/api/visitors/track', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          page: currentPage,
          url: window.location.pathname
        })
      });
    } catch (err) {
      // Fallback a /api/track si fuese necesario
      try {
        await fetch('/api/track', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            page: currentPage,
            url: window.location.pathname
          })
        });
      } catch (e) {
        // La analítica nunca debe romper la experiencia de usuario
      }
    }
  }

  async function sendHeartbeat() {
    try {
      await fetch('/api/visitors/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          page: currentPage
        })
      });
    } catch (err) {
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            page: currentPage
          })
        });
      } catch (e) {}
    }
  }

  function startTracking(pageName) {
    sendTrack(pageName);

    if (!heartbeatTimer) {
      heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }
  }

  function stopTracking() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // Exponer a ventana global
  window.trackPageView = startTracking;
  window.stopVisitorTracking = stopTracking;

  // Auto-iniciar en carga de documento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startTracking());
  } else {
    startTracking();
  }
})();
