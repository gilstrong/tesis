/**
 * ServiGaco - Sistema de Monitoreo de Visitantes
 * Con desconexión inmediata, latidos automáticos y reconexión en visibilidad.
 */
(function() {
  'use strict';

  let visitorId = localStorage.getItem('servigaco_visitor_id');
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('servigaco_visitor_id', visitorId);
  }

  const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 segundos
  let heartbeatTimer = null;
  let currentPage = document.title || window.location.pathname;
  let lastTrackTime = 0;
  let lastTrackPage = '';

  async function sendTrack(pageName) {
    currentPage = pageName || document.title || window.location.pathname;

    // Evitar disparar dos veces para la misma página en menos de 2 segundos
    const now = Date.now();
    if (currentPage === lastTrackPage && now - lastTrackTime < 2000) {
      return;
    }
    lastTrackTime = now;
    lastTrackPage = currentPage;

    try {
      await fetch('/api/visitors/track', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          page: currentPage,
          url: window.location.pathname,
        }),
      });
    } catch (err) {
      try {
        await fetch('/api/track', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            page: currentPage,
            url: window.location.pathname,
          }),
        });
      } catch (e) {}
    }
  }

  async function sendHeartbeat() {
    // Si la pestaña está oculta, no enviar latidos
    if (document.visibilityState === 'hidden') return;

    try {
      await fetch('/api/visitors/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          page: currentPage,
        }),
      });
    } catch (err) {
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            page: currentPage,
          }),
        });
      } catch (e) {}
    }
  }

  /**
   * Desconexión inmediata al salir o cambiar de pestaña.
   * navigator.sendBeacon garantiza que la solicitud salga incluso al cerrar el navegador.
   */
  function sendDisconnect() {
    const payload = JSON.stringify({ visitorId, page: currentPage });
    const url = '/api/visitors/disconnect';

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
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

  // Escuchar cuando el usuario sale del sitio o cierra la ventana
  window.addEventListener('pagehide', sendDisconnect);
  window.addEventListener('beforeunload', sendDisconnect);

  // Escuchar cuando minimiza o cambia de pestaña sin desconectar bruscamente (crucial para móviles)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Al volver a la pestaña, envía latido y reactiva el temporizador
      sendHeartbeat();
      if (!heartbeatTimer) {
        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
      }
    } else {
      // Si la pestaña está oculta o en segundo plano en celular, pausar latidos para ahorrar batería
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }
  });

  // Exponer API global
  window.trackPageView = startTracking;
  window.stopVisitorTracking = stopTracking;

  // Iniciar automáticamente al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startTracking());
  } else {
    startTracking();
  }
})();
