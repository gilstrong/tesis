'use strict';
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const { getClientIp, maskIp } = require('../utils/getClientIp');
const { parseDevice } = require('../utils/deviceParser');
const { getApproximateLocation, formatLocationLabel } = require('../services/geoLocationService');
const visitorService = require('../services/visitorService');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

const VISITOR_COOKIE = 'sg_vid';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 año
const ACTIVE_WINDOW_MS = 1000 * 60 * 5; // 5 minutos

// ─── RATE LIMITING (180 solicitudes por minuto por IP real) ───────────────────
const visitorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 180, // Generoso para que latidos y navegación múltiple no bloqueen al visitante
  keyGenerator: (req) => getClientIp(req) || 'unknown_ip',
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Límite de solicitudes de analítica alcanzado' },
  skip: (req) => req.method === 'OPTIONS',
});

// ─── FILTRO DE BOTS, CRAWLERS Y PROBES DE NUBE ────────────────────────────────
const BOT_REGEX = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|curl|wget|postman|uptimerobot|headlesschrome|python-requests|node-fetch|axios|httpclient|go-http-client|render|healthcheck|kube-probe|datadog|pingdom/i;

function isBot(userAgent) {
  if (!userAgent) return false;
  return BOT_REGEX.test(userAgent);
}

// ─── EXCLUSIÓN DE IPs PROPIAS ─────────────────────────────────────────────────
function isExcludedIp(ip) {
  if (!process.env.EXCLUDED_IPS) return false;
  const excluded = process.env.EXCLUDED_IPS.split(',').map((s) => s.trim());
  return excluded.includes(ip);
}

// ─── ANTI-DUPLICADOS (Ignora tracks idénticos en menos de 2 segundos) ──────────
const recentTracks = new Map(); // visitorId -> { page, time }

function isDuplicateTrack(visitorId, page) {
  const now = Date.now();
  const last = recentTracks.get(visitorId);
  if (last && last.page === page && now - last.time < 2000) {
    return true;
  }
  recentTracks.set(visitorId, { page, time: now });

  // Limpieza periódica de la memoria de duplicados (máx 1000 entradas)
  if (recentTracks.size > 1000) {
    const oldestKey = recentTracks.keys().next().value;
    recentTracks.delete(oldestKey);
  }
  return false;
}

function getOrCreateVisitorId(req, res) {
  let visitorId = req.cookies ? req.cookies[VISITOR_COOKIE] : null;

  if (!visitorId && req.body?.visitorId) {
    visitorId = req.body.visitorId;
  }

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    res.cookie(VISITOR_COOKIE, visitorId, {
      maxAge: COOKIE_MAX_AGE_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return visitorId;
}

/**
 * POST /api/visitors/track
 * Registra una vista de página si no es bot, ni IP excluida, ni duplicado rápido.
 */
router.post('/track', visitorLimiter, async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    if (isBot(userAgent)) {
      return res.status(200).json({ ok: true, ignored: 'bot' });
    }

    const ip = getClientIp(req);
    if (isExcludedIp(ip)) {
      return res.status(200).json({ ok: true, ignored: 'excluded_ip' });
    }

    const visitorId = getOrCreateVisitorId(req, res);
    const page = req.body?.page || 'Página principal';

    if (isDuplicateTrack(visitorId, page)) {
      return res.status(200).json({ ok: true, ignored: 'duplicate' });
    }

    const { browser, os, deviceType } = parseDevice(userAgent);
    const location = await getApproximateLocation(ip);

    await visitorService.logVisit({
      visitorId,
      ip,
      page,
      browser,
      os,
      deviceType,
      userAgent,
      location,
    });

    res.json({ ok: true, visitorId });
  } catch (err) {
    console.error('[visitorRoutes] Error en /track:', err);
    res.status(200).json({ ok: false });
  }
});

/**
 * POST /api/visitors/heartbeat
 * Mantiene la sesión como activa mientras la pestaña está abierta.
 */
router.post('/heartbeat', visitorLimiter, async (req, res) => {
  try {
    const visitorId = (req.cookies ? req.cookies[VISITOR_COOKIE] : null) || req.body?.visitorId;
    if (!visitorId) {
      return res.status(200).json({ ok: false, reason: 'sin visitorId' });
    }
    await visitorService.heartbeat({ visitorId, page: req.body?.page });
    res.json({ ok: true });
  } catch (err) {
    console.error('[visitorRoutes] Error en /heartbeat:', err);
    res.status(200).json({ ok: false });
  }
});

/**
 * POST /api/visitors/disconnect
 * Desconexión inmediata: llamado vía navigator.sendBeacon al cerrar o cambiar pestaña.
 */
router.post('/disconnect', visitorLimiter, async (req, res) => {
  try {
    const visitorId = (req.cookies ? req.cookies[VISITOR_COOKIE] : null) || req.body?.visitorId;
    if (visitorId) {
      await visitorService.disconnect({ visitorId });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[visitorRoutes] Error en /disconnect:', err);
    res.status(200).json({ ok: false });
  }
});

/* ---------- Rutas de administrador (protegidas) ---------- */

router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await visitorService.getStats();
    res.json(stats);
  } catch (err) {
    console.error('[visitorRoutes] Error en /admin/stats:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

router.get('/admin/active', requireAdmin, async (req, res) => {
  try {
    const active = await visitorService.getActiveVisitors();
    res.json(active.map(formatVisitorForAdmin));
  } catch (err) {
    console.error('[visitorRoutes] Error en /admin/active:', err);
    res.status(500).json({ error: 'Error obteniendo visitantes activos' });
  }
});

router.get('/admin/recent', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const recent = await visitorService.getRecentVisits(limit);
    res.json(recent.map(formatVisitorForAdmin));
  } catch (err) {
    console.error('[visitorRoutes] Error en /admin/recent:', err);
    res.status(500).json({ error: 'Error obteniendo visitas recientes' });
  }
});

function formatVisitorForAdmin(v) {
  const lastSeenDate = v.lastSeen?.toDate ? v.lastSeen.toDate() : v.lastSeen;
  const isActive = lastSeenDate && v.active !== false
    ? Date.now() - new Date(lastSeenDate).getTime() < ACTIVE_WINDOW_MS
    : false;

  const displayIp = v.publicIp ? `${maskIp(v.publicIp)} (${maskIp(v.ip)})` : maskIp(v.ip);

  return {
    visitorId: v.visitorId,
    ipMasked: displayIp,
    ip: displayIp,
    location: formatLocationLabel({ city: v.city, region: v.region, country: v.country }),
    locationString: formatLocationLabel({ city: v.city, region: v.region, country: v.country }),
    country: v.country || 'Desconocido',
    city: v.city || 'Desconocida',
    isp: v.isp || 'N/A',
    browser: v.browser || 'Desconocido',
    os: v.os || 'Desconocido',
    device: v.deviceType || 'Desktop',
    deviceType: v.deviceType || 'Desktop',
    page: v.page || 'Desconocida',
    lastSeen: lastSeenDate,
    isActive,
  };
}

module.exports = router;
