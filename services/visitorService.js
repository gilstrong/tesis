'use strict';

const { db, admin } = require('../config/firebase');

const LOGS_COLLECTION = 'visitor_logs';
const SESSIONS_COLLECTION = 'visitor_sessions';
const ACTIVE_WINDOW_MS = 1000 * 60 * 5; // 5 minutos

// Memoria volátil de respaldo en caso de que Firestore no esté conectado
const memorySessions = new Map();
const memoryLogs = [];
const MAX_MEMORY_LOGS = 500;

/**
 * Registra una "vista de página" (log inmutable) y crea/actualiza
 * la sesión del visitante (para saber quién está activo ahora mismo).
 */
async function logVisit({ visitorId, ip, page, browser, os, deviceType, userAgent, location }) {
  const now = admin && admin.firestore && admin.firestore.FieldValue
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date();

  const nowJsDate = new Date();

  const logEntry = {
    visitorId,
    ip,
    page: page || 'desconocida',
    browser,
    os,
    deviceType,
    userAgent,
    country: location ? location.country : null,
    region: location ? location.region : null,
    city: location ? location.city : null,
    isp: location ? location.isp : null,
    approximateLocation: location ? location.approximate : false,
    createdAt: now,
  };

  // Guardar en respaldo en memoria
  const memoryEntry = { ...logEntry, createdAt: nowJsDate };
  memoryLogs.unshift(memoryEntry);
  if (memoryLogs.length > MAX_MEMORY_LOGS) memoryLogs.pop();

  const existingMemory = memorySessions.get(visitorId);
  memorySessions.set(visitorId, {
    ...memoryEntry,
    firstSeen: existingMemory ? existingMemory.firstSeen : nowJsDate,
    lastSeen: nowJsDate,
    active: true,
  });

  // Guardar en Firestore si está disponible
  if (db) {
    try {
      const sessionRef = db.collection(SESSIONS_COLLECTION).doc(visitorId);
      const existingSession = await sessionRef.get();

      await Promise.all([
        db.collection(LOGS_COLLECTION).add(logEntry),
        sessionRef.set(
          {
            visitorId,
            ip,
            page: page || 'desconocida',
            browser,
            os,
            deviceType,
            country: location ? location.country : null,
            region: location ? location.region : null,
            city: location ? location.city : null,
            isp: location ? location.isp : null,
            approximateLocation: location ? location.approximate : false,
            ...(existingSession.exists ? {} : { firstSeen: now }),
            lastSeen: now,
          },
          { merge: true }
        ),
      ]);
    } catch (err) {
      console.warn('[visitorService] Error guardando en Firestore (usando memoria):', err.message);
    }
  }

  return logEntry;
}

/**
 * Heartbeat: solo actualiza lastSeen (y opcionalmente la página actual)
 * de la sesión del visitante. No crea un nuevo log en cada heartbeat
 * para no inflar visitor_logs.
 */
async function heartbeat({ visitorId, page }) {
  const nowJsDate = new Date();

  if (memorySessions.has(visitorId)) {
    const s = memorySessions.get(visitorId);
    s.lastSeen = nowJsDate;
    if (page) s.page = page;
    memorySessions.set(visitorId, s);
  }

  if (db) {
    try {
      const sessionRef = db.collection(SESSIONS_COLLECTION).doc(visitorId);
      const update = {
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (page) update.page = page;

      await sessionRef.set(update, { merge: true });
    } catch (err) {
      console.warn('[visitorService] Error heartbeat en Firestore:', err.message);
    }
  }
}

/**
 * Visitantes activos = sesiones cuyo lastSeen fue dentro de la ventana activa.
 */
async function getActiveVisitors() {
  const cutoffTime = Date.now() - ACTIVE_WINDOW_MS;
  const cutoff = new Date(cutoffTime);

  if (db) {
    try {
      const snapshot = await db
        .collection(SESSIONS_COLLECTION)
        .where('lastSeen', '>=', cutoff)
        .orderBy('lastSeen', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn('[visitorService] Error getActiveVisitors en Firestore:', err.message);
    }
  }

  // Fallback memoria
  return Array.from(memorySessions.values()).filter(
    (s) => new Date(s.lastSeen).getTime() >= cutoffTime
  );
}

/**
 * Historial crudo de vistas de página.
 */
async function getRecentLogEntries(limit = 100) {
  if (db) {
    try {
      const snapshot = await db
        .collection(LOGS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn('[visitorService] Error getRecentLogEntries en Firestore:', err.message);
    }
  }

  return memoryLogs.slice(0, limit);
}

/**
 * Sesiones de visitantes recientes.
 */
async function getRecentVisits(limit = 50) {
  if (db) {
    try {
      const snapshot = await db
        .collection(SESSIONS_COLLECTION)
        .orderBy('lastSeen', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn('[visitorService] Error getRecentVisits en Firestore:', err.message);
    }
  }

  return Array.from(memorySessions.values())
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    .slice(0, limit);
}

/**
 * Métricas y estadísticas agregadas.
 */
async function getStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (db) {
    try {
      const [totalSnap, todaySnap, weekSnap, activeVisitors, weekLogsSnap] = await Promise.all([
        db.collection(LOGS_COLLECTION).count().get(),
        db.collection(LOGS_COLLECTION).where('createdAt', '>=', startOfToday).count().get(),
        db.collection(LOGS_COLLECTION).where('createdAt', '>=', sevenDaysAgo).count().get(),
        getActiveVisitors(),
        db.collection(LOGS_COLLECTION).where('createdAt', '>=', sevenDaysAgo).limit(2000).get(),
      ]);

      const countryCounts = {};
      const cityCounts = {};
      weekLogsSnap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.country) countryCounts[d.country] = (countryCounts[d.country] || 0) + 1;
        if (d.city) cityCounts[d.city] = (cityCounts[d.city] || 0) + 1;
      });

      const topCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count }));

      const topCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([city, count]) => ({ city, count }));

      return {
        totalVisits: totalSnap.data().count,
        todayVisits: todaySnap.data().count,
        last7DaysVisits: weekSnap.data().count,
        activeNow: activeVisitors.length,
        topCountries,
        topCities,
      };
    } catch (err) {
      console.warn('[visitorService] Error getStats en Firestore:', err.message);
    }
  }

  // Fallback memoria
  const activeVisitors = await getActiveVisitors();
  const todayLogs = memoryLogs.filter((l) => new Date(l.createdAt) >= startOfToday);
  const weekLogs = memoryLogs.filter((l) => new Date(l.createdAt) >= sevenDaysAgo);

  const countryCounts = {};
  const cityCounts = {};
  weekLogs.forEach((l) => {
    if (l.country) countryCounts[l.country] = (countryCounts[l.country] || 0) + 1;
    if (l.city) cityCounts[l.city] = (cityCounts[l.city] || 0) + 1;
  });

  return {
    totalVisits: memoryLogs.length,
    todayVisits: todayLogs.length,
    last7DaysVisits: weekLogs.length,
    activeNow: activeVisitors.length,
    topCountries: Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count })),
    topCities: Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count })),
  };
}

module.exports = {
  logVisit,
  heartbeat,
  getActiveVisitors,
  getRecentVisits,
  getRecentLogEntries,
  getStats,
};
