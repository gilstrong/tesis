'use strict';
const UAParserLib = require('ua-parser-js');
const UAParser = UAParserLib.UAParser || UAParserLib;

/**
 * Extrae navegador, sistema operativo y tipo de dispositivo
 * a partir del User-Agent enviado por el cliente.
 */
function parseDevice(userAgent) {
  const parser = new UAParser(userAgent || '');
  const result = parser.getResult();

  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.version || ''}`.trim()
    : 'Desconocido';

  const os = result.os.name
    ? `${result.os.name} ${result.os.version || ''}`.trim()
    : 'Desconocido';

  let deviceType = 'Desktop';
  if (result.device.type === 'mobile') deviceType = 'Celular';
  else if (result.device.type === 'tablet') deviceType = 'Tablet';
  else if (result.device.type === 'smarttv') deviceType = 'Smart TV';
  else if (result.device.type) deviceType = result.device.type;

  return { browser, os, deviceType };
}

module.exports = { parseDevice };
