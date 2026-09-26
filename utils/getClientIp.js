'use strict';

/**
 * Verifica si una dirección IP pertenece a una red local, privada o de contenedor interno.
 */
function isInternalContainerIp(ip) {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('::ffff:10.') ||
    ip.startsWith('::ffff:192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
    ip === 'localhost'
  );
}

/**
 * Limpia y normaliza una cadena de IP.
 */
function cleanIpString(ip) {
  if (!ip || typeof ip !== 'string') return '';
  let clean = ip.trim();

  // Si viene con comillas
  clean = clean.replace(/['"]/g, '');

  // Si tiene puerto IPv4 (ej. 192.168.1.1:54321)
  if (clean.includes(':') && !clean.includes('::') && clean.split(':').length === 2) {
    clean = clean.split(':')[0];
  }

  // Normaliza IPv4 mapeadas en IPv6 (::ffff:190.1.2.3 -> 190.1.2.3)
  if (clean.startsWith('::ffff:')) {
    clean = clean.substring(7);
  }

  return clean.trim();
}

/**
 * Obtiene la IP pública real del visitante.
 * Compatible con Render, Cloudflare, proxies reversos y desarrollo local.
 */
function getClientIp(req) {
  if (!req) return '';

  // 1. Cloudflare header
  const cfIp = req.headers && req.headers['cf-connecting-ip'];
  if (cfIp) {
    const cleaned = cleanIpString(Array.isArray(cfIp) ? cfIp[0] : cfIp);
    if (cleaned && !isInternalContainerIp(cleaned)) return cleaned;
  }

  // 2. True-Client-IP (Cloudflare Enterprise / Akamai)
  const trueClientIp = req.headers && req.headers['true-client-ip'];
  if (trueClientIp) {
    const cleaned = cleanIpString(Array.isArray(trueClientIp) ? trueClientIp[0] : trueClientIp);
    if (cleaned && !isInternalContainerIp(cleaned)) return cleaned;
  }

  // 3. X-Real-IP (Nginx / Balanceadores)
  const realIp = req.headers && req.headers['x-real-ip'];
  if (realIp) {
    const cleaned = cleanIpString(Array.isArray(realIp) ? realIp[0] : realIp);
    if (cleaned && !isInternalContainerIp(cleaned)) return cleaned;
  }

  // 4. X-Forwarded-For: lista separada por comas (cliente, proxy1, proxy2...)
  // El cliente real es la primera IP pública válida (de izquierda a derecha).
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    const forwardedStr = Array.isArray(forwarded) ? forwarded.join(',') : String(forwarded);
    const ips = forwardedStr.split(',').map((s) => cleanIpString(s)).filter(Boolean);
    const publicClientIp = ips.find((ip) => !isInternalContainerIp(ip));
    if (publicClientIp) {
      return publicClientIp;
    }
    if (ips.length > 0) {
      return ips[0];
    }
  }

  // 5. Express req.ip (cuando trust proxy está activado)
  if (req.ip) {
    const cleaned = cleanIpString(req.ip);
    if (cleaned && !isInternalContainerIp(cleaned)) return cleaned;
  }

  // 6. Socket remote address (desarrollo local / localhost)
  const rawIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  return cleanIpString(rawIp);
}

/**
 * Enmascara una IP para proteger la privacidad en el panel admin.
 * 186.123.45.67 -> 186.xxx.xxx.xxx
 */
function maskIp(ip) {
  if (!ip) return 'IP desconocida';

  // Si viene con información adicional como "179.x.x.x (10.x.x.x)"
  if (ip.includes('(')) {
    return ip;
  }

  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.xxx.xxx.xxx`;
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts[0]}:xxxx:xxxx::xxxx`;
  }

  return ip;
}

module.exports = { getClientIp, maskIp, isInternalContainerIp, cleanIpString };
