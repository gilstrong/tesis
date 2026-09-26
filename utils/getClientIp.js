'use strict';

/**
 * Obtiene la IP pública real del visitante.
 * Requiere que en server.js se configure `app.set('trust proxy', ...)`
 * correctamente para que Express confíe en el encabezado X-Forwarded-For
 * que agrega Render u otros proxies reversos.
 */
function getClientIp(req) {
  let ip = req.ip || req.connection?.remoteAddress || '';

  // Normaliza IPv4 mapeadas en IPv6 (::ffff:190.1.2.3 -> 190.1.2.3)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
}

/**
 * Enmascara una IP para mostrarla en el panel admin sin exponerla completa.
 * 186.123.45.67 -> 186.xxx.xxx.xxx
 */
function maskIp(ip) {
  if (!ip) return 'IP desconocida';

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

module.exports = { getClientIp, maskIp };
