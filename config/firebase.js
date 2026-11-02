'use strict';

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

/**
 * Inicialización robusta de Firebase Admin SDK.
 * Compatible con desarrollo local (serviceAccountKey.json / GOOGLE_APPLICATION_CREDENTIALS)
 * y despliegue en la nube como Render (FIREBASE_SERVICE_ACCOUNT como JSON string).
 */
function initFirebase() {
  if (admin.apps.length) {
    return admin.app();
  }

  let credential = null;

  try {
    // 1. Variable en Render o Cloud con el JSON completo como string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      let parsed = JSON.parse(raw);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      credential = admin.credential.cert(parsed);
      console.log('✅ Firebase Admin: Inicializado desde FIREBASE_SERVICE_ACCOUNT (variable de entorno).');
    }
    // 2. Ruta explícita en variable de entorno
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const resolvedPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = require(resolvedPath);
        credential = admin.credential.cert(serviceAccount);
        console.log(`✅ Firebase Admin: Inicializado desde ruta ${resolvedPath}`);
      } else {
        console.warn(`⚠️ Ruta FIREBASE_SERVICE_ACCOUNT_PATH no encontrada: ${resolvedPath}`);
      }
    }
    // 3. Archivo serviceAccountKey.json en la raíz del proyecto
    if (!credential) {
      const localKeyPaths = [
        path.resolve(process.cwd(), 'serviceAccountKey.json'),
        path.resolve(__dirname, '../serviceAccountKey.json'),
        path.resolve(__dirname, '../../serviceAccountKey.json')
      ];

      for (const p of localKeyPaths) {
        if (fs.existsSync(p)) {
          const serviceAccount = require(p);
          credential = admin.credential.cert(serviceAccount);
          console.log(`✅ Firebase Admin: Inicializado desde archivo local: ${p}`);
          break;
        }
      }
    }

    // 4. GOOGLE_APPLICATION_CREDENTIALS o Application Default Credentials
    if (!credential) {
      credential = admin.credential.applicationDefault();
      console.log('ℹ️ Firebase Admin: Intentando Application Default Credentials.');
    }

    admin.initializeApp({ credential });
    console.log('🔥 Firebase Admin inicializado exitosamente.');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin SDK:', error.message);
  }

  return admin;
}

initFirebase();

const db = admin.apps.length ? admin.firestore() : null;

module.exports = { admin, db };
