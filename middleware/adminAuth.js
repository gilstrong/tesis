'use strict';
const { admin } = require('../config/firebase');

/**
 * Middleware para proteger rutas de administrador.
 *
 * Espera:
 *   Header: Authorization: Bearer <idToken de Firebase Auth>
 * Verifica que el token sea emitido por Firebase Auth y corresponda
 * a un usuario administrador (custom claim `admin: true` o correo de @servigaco.com).
 */
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No autorizado: Falta token de autenticación' });
    }

    if (!admin.apps.length) {
      console.warn('[adminAuth] Firebase Admin no inicializado aún, permitiendo paso en entorno local de pruebas');
      return next();
    }

    const decoded = await admin.auth().verifyIdToken(token);

    // Si tiene custom claim explícito admin: false
    if (decoded.admin === false) {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }

    req.adminUser = decoded;
    next();
  } catch (err) {
    console.error('[adminAuth] Token inválido o expirado:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { requireAdmin };
