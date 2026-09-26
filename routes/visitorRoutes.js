'use strict';
const express = require('express');
const crypto = require('crypto');

const { getClientIp, maskIp } = require('../utils/getClientIp');
const { parseDevice } = require('../utils/deviceParser');
const { getApproximateLocation, formatLocationLabel } = require('../services/geoLocationService');
const visitorService = require('../services/visitorService');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

const VISITOR_COOKIE = 'sg_vid';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 año
const ACTIVE_WINDOW_MS = 1000 * 60 * 5; // 5 minutos

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
 * Llamar desde el frontend en cada carga de página / cambio de ruta.
 * Body: { page: "Calculadora de Tesis", url: "/index.html" }
 */
router.post('/track', async (req, res) => {
  try {
    const visitorId = getOrCreateVisitorId(req, res);
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const { browser, os, deviceType } = parseDevice(userAgent);
    const location = await getApproximateLocation(ip);

    await visitorService.logVisit({
      visitorId,
      ip,
      page: req.body?.page,
      browser,
      os,
      deviceType,
      userAgent,
      location,
    });

    res.json({ ok: true, visitorId });
  } catch (err) {
    console.error('[visitorRoutes] Error en /track:', err);
    // Un fallo de analítica nunca debe romper la experiencia del usuario.
    res.status(200).json({ ok: false });
  }
});

/**
 * POST /api/visitors/heartbeat
 * Llamar periódicamente (cada 30-60s) mientras la página está abierta.
 * Body: { page: "Calculadora de Tesis" } (opcional)
 */
router.post('/heartbeat', async (req, res) => {
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
  const isActive = lastSeenDate
    ? Date.now() - new Date(lastSeenDate).getTime() < ACTIVE_WINDOW_MS
    : false;

  return {
    visitorId: v.visitorId,
    ipMasked: maskIp(v.ip),
    ip: maskIp(v.ip),
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
