'use strict';
const express = require('express');
const visitorService = require('../services/visitorService');
const { formatLocationLabel } = require('../services/geoLocationService');
const { maskIp, getClientIp } = require('../utils/getClientIp');
const { parseDevice } = require('../utils/deviceParser');
const { getApproximateLocation } = require('../services/geoLocationService');

const router = express.Router();
const ACTIVE_WINDOW_MS = 1000 * 60 * 5;

/**
 * GET /api/analytics
 * Endpoint consolidado para el dashboard HTML de analítica de visitantes.
 */
router.get('/analytics', async (req, res) => {
  try {
    const [stats, activeDocs, logDocs] = await Promise.all([
      visitorService.getStats(),
      visitorService.getActiveVisitors(),
      visitorService.getRecentLogEntries(100),
    ]);

    const activeVisitors = activeDocs.map((v) => {
      const lastSeen = v.lastSeen?.toDate ? v.lastSeen.toDate() : v.lastSeen;
      return {
        visitorId: v.visitorId,
        ip: maskIp(v.ip),
        locationString: formatLocationLabel({ city: v.city, region: v.region, country: v.country }),
        country: v.country || 'Desconocido',
        city: v.city || 'Desconocida',
        isp: v.isp || 'N/A',
        browser: v.browser || 'Desconocido',
        os: v.os || 'Desconocido',
        device: v.deviceType || 'Desktop',
        page: v.page || 'Desconocida',
        lastSeen: lastSeen,
        isActive: lastSeen ? Date.now() - new Date(lastSeen).getTime() < ACTIVE_WINDOW_MS : false,
      };
    });

    const recentLogs = logDocs.map((l) => {
      const firstVisit = l.createdAt?.toDate ? l.createdAt.toDate() : l.createdAt;
      return {
        firstVisit: firstVisit,
        locationString: formatLocationLabel({ city: l.city, region: l.region, country: l.country }),
        ip: maskIp(l.ip),
        browser: l.browser || 'Desconocido',
        os: l.os || 'Desconocido',
        device: l.deviceType || 'Desktop',
        page: l.page || 'Desconocida',
      };
    });

    res.json({
      success: true,
      activeVisitorsCount: activeVisitors.length,
      totalVisits: stats.totalVisits,
      todayVisits: stats.todayVisits,
      last7DaysVisits: stats.last7DaysVisits,
      topCountries: stats.topCountries,
      topCities: stats.topCities,
      activeVisitors,
      recentLogs,
    });
  } catch (error) {
    console.error('[analyticsRoutes] Error en /api/analytics:', error);
    res.status(500).json({ error: 'Error obteniendo datos de analítica' });
  }
});

/**
 * Compatibilidad hacia atrás:
 * POST /api/track y POST /api/heartbeat para clientes antiguos o llamadas sin prefijo /visitors
 */
router.post('/track', async (req, res) => {
  try {
    const visitorId = req.body?.visitorId || (req.cookies ? req.cookies['sg_vid'] : null) || 'anonymous';
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

    res.json({ success: true, message: 'Tracked successfully' });
  } catch (error) {
    console.error('[analyticsRoutes] Error en legacy /api/track:', error);
    res.json({ success: true, fallback: true });
  }
});

router.post('/heartbeat', async (req, res) => {
  try {
    const visitorId = req.body?.visitorId || (req.cookies ? req.cookies['sg_vid'] : null);
    if (visitorId) {
      await visitorService.heartbeat({ visitorId, page: req.body?.page });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[analyticsRoutes] Error en legacy /api/heartbeat:', error);
    res.json({ success: true, fallback: true });
  }
});

module.exports = router;
