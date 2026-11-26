'use strict';

const assert = require('assert');

console.log('🧪 Iniciando Smoke Tests para la plataforma ServiGaco...\n');

// 1. Verificar carga de configuración de precios
console.log('1. Verificando catálogo de precios compartido (pricing-config)...');
const pricing = require('../public/pricing-config');
assert.ok(pricing.DEFAULTS, 'DEFAULTS debe estar definido');
assert.ok(pricing.DEFAULTS.tesis, 'Debe existir configuración de tesis');
assert.ok(pricing.DEFAULTS.general, 'Debe existir configuración de general');
const catalog = pricing.buildCatalog();
const errors = pricing.validate(catalog);
assert.strictEqual(errors.length, 0, 'El catálogo por defecto no debe tener errores de validación');
console.log('   ✅ pricing-config verificado correctamente.');

// 2. Verificar utilidades de dispositivo e IP
console.log('2. Verificando utilidades de dispositivo e IP...');
const { parseDevice } = require('../utils/deviceParser');
const { maskIp } = require('../utils/getClientIp');

const parsed = parseDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
assert.ok(parsed.os.startsWith('Windows'), 'Debe detectar sistema operativo Windows');
assert.ok(parsed.browser.startsWith('Chrome'), 'Debe detectar navegador Chrome');
assert.strictEqual(parsed.deviceType, 'Desktop', 'Debe detectar Desktop');

const masked = maskIp('192.168.1.100');
assert.strictEqual(masked, '192.xxx.xxx.xxx', 'La IP enmascarada debe tener formato 192.xxx.xxx.xxx');
console.log('   ✅ utils/deviceParser y utils/getClientIp verificados correctamente.');

// 3. Verificar inicialización de Firebase
console.log('3. Verificando módulo de configuración Firebase...');
const firebase = require('../config/firebase');
assert.ok(firebase.admin, 'Firebase Admin debe exportarse');
console.log('   ✅ config/firebase verificado correctamente.');

// 4. Verificar controladores y servicios
console.log('4. Verificando controladores y servicios...');
const pdfController = require('../controllers/pdfController');
assert.strictEqual(typeof pdfController.analizarPDF, 'function', 'analizarPDF debe ser una función');
assert.strictEqual(typeof pdfController.generarPDF, 'function', 'generarPDF debe ser una función');
assert.strictEqual(typeof pdfController.closeBrowser, 'function', 'closeBrowser debe ser una función');

const notionService = require('../services/notionService');
assert.strictEqual(typeof notionService.syncTesis, 'function', 'syncTesis debe ser una función');
assert.strictEqual(typeof notionService.syncGeneral, 'function', 'syncGeneral debe ser una función');
assert.strictEqual(typeof notionService.syncFactura, 'function', 'syncFactura debe ser una función');

const visitorService = require('../services/visitorService');
assert.strictEqual(typeof visitorService.logVisit, 'function', 'logVisit debe ser una función');
assert.strictEqual(typeof visitorService.getStats, 'function', 'getStats debe ser una función');
console.log('   ✅ Controladores y servicios verificados correctamente.');

// 5. Verificar compatibilidad hacia atrás en tesis/
console.log('5. Verificando compatibilidad de rutas legadas en tesis/...');
const legacyPdf = require('../tesis/pdfController');
assert.strictEqual(legacyPdf.analizarPDF, pdfController.analizarPDF, 'tesis/pdfController debe re-exportar controllers/pdfController');
const legacyNotion = require('../tesis/notionService');
assert.strictEqual(legacyNotion.syncTesis, notionService.syncTesis, 'tesis/notionService debe re-exportar services/notionService');
console.log('   ✅ Compatibilidad de tesis/ verificada correctamente.');

console.log('\n🎉 ¡Todos los tests pasaron exitosamente (7/7 comprobaciones)!');
process.exit(0);
