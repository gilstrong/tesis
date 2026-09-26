'use strict';

/**
 * Servicio de geolocalización por IP.
 *
 * 1. Usa ipinfo.io si se define IPINFO_TOKEN en el .env (recomendado para producción).
 * 2. Si no hay token, usa ip-api.com (gratis, sin key, ~45 req/min).
 * 3. Si las APIs externas fallan, usa geoip-lite local como fallback inmediato sin conexión.
 *
 * Cachea resultados en memoria por IP durante 1 hora (GEO_CACHE_TTL_MS).
 */

const geoip = require('geoip-lite');

const GEO_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora
const geoCache = new Map(); // ip -> { data, expiresAt }

const IPINFO_TOKEN = process.env.IPINFO_TOKEN || null;

function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('::ffff:127.') ||
    ip === 'localhost'
  );
}

async function fetchFromIpInfo(ip) {
  const url = `https://ipinfo.io/${ip}/json?token=${IPINFO_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ipinfo.io respondió ${res.status}`);
  const json = await res.json();
  const [lat, lon] = (json.loc || ',').split(',');
  return {
    country: json.country || null,
    region: json.region || null,
    city: json.city || null,
    isp: json.org || null,
    lat: lat ? Number(lat) : null,
    lon: lon ? Number(lon) : null,
    source: 'ipinfo.io',
  };
}

async function fetchFromIpApi(ip) {
  const url = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,lat,lon`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ip-api.com respondió ${res.status}`);
  const json = await res.json();
  if (json.status !== 'success') {
    throw new Error(json.message || 'ip-api.com no pudo geolocalizar la IP');
  }
  return {
    country: json.country || null,
    region: json.regionName || null,
    city: json.city || null,
    isp: json.isp || null,
    lat: typeof json.lat === 'number' ? json.lat : null,
    lon: typeof json.lon === 'number' ? json.lon : null,
    source: 'ip-api.com',
  };
}

function fetchFromGeoipLite(ip) {
  try {
    const geo = geoip.lookup(ip);
    if (!geo) return null;
    return {
      country: geo.country || null,
      region: geo.region || null,
      city: geo.city || null,
      isp: null,
      lat: geo.ll && geo.ll[0] ? geo.ll[0] : null,
      lon: geo.ll && geo.ll[1] ? geo.ll[1] : null,
      source: 'geoip-lite',
    };
  } catch (e) {
    return null;
  }
}

/**
 * Devuelve la ubicación aproximada de una IP.
 * Nunca lanza excepciones: si falla, devuelve un objeto seguro con campos null
 * y approximate: false para no interrumpir el registro de visitas.
 */
async function getApproximateLocation(ip) {
  if (isPrivateOrLocalIp(ip)) {
    return {
      country: 'Local',
      region: 'Desarrollo',
      city: 'Localhost',
      isp: 'Red Local',
      lat: null,
      lon: null,
      approximate: false,
      note: 'IP privada/local (probablemente entorno de desarrollo)',
    };
  }

  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let data = null;
  try {
    if (IPINFO_TOKEN) {
      data = await fetchFromIpInfo(ip);
    } else {
      data = await fetchFromIpApi(ip);
    }
    data.approximate = true;
  } catch (err) {
    // Fallback a geoip-lite local si falla la red externa
    const localGeo = fetchFromGeoipLite(ip);
    if (localGeo) {
      data = { ...localGeo, approximate: true };
    } else {
      console.warn(`[geoLocationService] No se pudo geolocalizar ${ip}:`, err.message);
      data = {
        country: null,
        region: null,
        city: null,
        isp: null,
        lat: null,
        lon: null,
        approximate: false,
        note: 'No se pudo determinar la ubicación',
      };
    }
  }

  geoCache.set(ip, { data, expiresAt: Date.now() + GEO_CACHE_TTL_MS });
  return data;
}

/**
 * Construye una etiqueta legible tipo:
 * "Santo Domingo Este, Santo Domingo, República Dominicana"
 */
function formatLocationLabel({ city, region, country }) {
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Ubicación desconocida';
}

module.exports = { getApproximateLocation, formatLocationLabel, isPrivateOrLocalIp };
