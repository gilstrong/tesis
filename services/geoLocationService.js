'use strict';

/**
 * Servicio de geolocalización por IP.
 *
 * 1. Usa ipinfo.io si se define IPINFO_TOKEN en el .env (recomendado para producción).
 * 2. Si no hay token, usa ip-api.com (gratis, sin key, ~45 req/min).
 * 3. Si la IP es de red local/Wi-Fi (192.168.x.x, 10.x.x.x, 127.0.0.1), detecta la ubicación
 *    pública real de la conexión de internet para que las pruebas desde celulares o PCs en la misma
 *    red muestren la geolocalización correcta (ej. Santo Domingo, República Dominicana).
 * 4. Fallback a geoip-lite local si falla la red externa.
 *
 * Cachea resultados en memoria por IP durante 1 hora (GEO_CACHE_TTL_MS).
 */

const geoip = require('geoip-lite');

const GEO_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora
const geoCache = new Map(); // ip -> { data, expiresAt }
let cachedPublicGatewayGeo = null;
let publicGatewayGeoExpiresAt = 0;

const IPINFO_TOKEN = process.env.IPINFO_TOKEN || null;

function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('::ffff:10.') ||
    ip.startsWith('::ffff:192.168.') ||
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
  const endpoint = ip ? `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,lat,lon,query` : 'http://ip-api.com/json/?fields=status,message,country,regionName,city,isp,lat,lon,query';
  const res = await fetch(endpoint);
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
    publicIp: json.query || null,
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
 * Cuando se prueba localmente o por red Wi-Fi privada (ej. celular conectado al router local),
 * resolvemos la geolocalización pública real de la conexión a internet.
 */
async function getPublicGatewayGeo() {
  if (cachedPublicGatewayGeo && Date.now() < publicGatewayGeoExpiresAt) {
    return cachedPublicGatewayGeo;
  }

  try {
    const data = await fetchFromIpApi('');
    cachedPublicGatewayGeo = {
      ...data,
      approximate: true,
      note: 'Conexión local/Wi-Fi (geolocalizada por salida a internet)',
    };
    publicGatewayGeoExpiresAt = Date.now() + GEO_CACHE_TTL_MS;
    return cachedPublicGatewayGeo;
  } catch (e) {
    return {
      country: 'República Dominicana',
      region: 'Santo Domingo',
      city: 'Santo Domingo',
      isp: 'Red Local',
      lat: null,
      lon: null,
      approximate: true,
      note: 'Red Local',
    };
  }
}

function isCloudOrProduction() {
  return Boolean(
    process.env.RENDER ||
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER_SERVICE_ID ||
    process.env.RENDER_INSTANCE_ID
  );
}

/**
 * Devuelve la ubicación aproximada de una IP.
 * Nunca lanza excepciones: si falla, devuelve un objeto seguro.
 */
async function getApproximateLocation(ip) {
  // Si es IP privada o local (10.x, 192.168.x, 127.0.0.1, etc.)
  if (isPrivateOrLocalIp(ip)) {
    // Si estamos en la nube (Render) o producción, NUNCA consultar la salida de internet sin IP
    // porque geolocalizaría el centro de datos de Render en Estados Unidos.
    if (isCloudOrProduction()) {
      return {
        country: 'Red Interna',
        region: 'Servidor',
        city: 'Proxy Nube',
        isp: 'Render / Internal',
        lat: null,
        lon: null,
        approximate: true,
        isLocalNetwork: true,
        note: 'IP interna de contenedor',
      };
    }

    // Solo en desarrollo local (PC del programador en red Wi-Fi hogareña)
    const gatewayGeo = await getPublicGatewayGeo();
    return {
      ...gatewayGeo,
      isLocalNetwork: true,
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
    const localGeo = fetchFromGeoipLite(ip);
    if (localGeo) {
      data = { ...localGeo, approximate: true };
    } else {
      console.warn(`[geoLocationService] No se pudo geolocalizar ${ip}:`, err.message);
      data = {
        country: 'Desconocido',
        region: 'Desconocido',
        city: 'Desconocida',
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
 * "Santo Domingo, Nacional, Dominican Republic"
 */
function formatLocationLabel({ city, region, country }) {
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Ubicación desconocida';
}

module.exports = { getApproximateLocation, formatLocationLabel, isPrivateOrLocalIp };
