(function (root) {
  'use strict';

  const DEFAULTS = {
    tesis: {
      impresion: {
        carta: {
          bond: { bn: 6, color: 12 },
          hilo: { bn: 8, color: 15 },
          satinado: { precio: 25 }
        },
        legal: {
          bondBN: [
            { min: 1, max: 50, precio: 10 },
            { min: 51, max: 200, precio: 8 },
            { min: 201, max: null, precio: 6 }
          ],
          bondColor: [
            { min: 1, max: 50, precio: 30 },
            { min: 51, max: 200, precio: 25 },
            { min: 201, max: null, precio: 20 }
          ],
          satinado: [
            { min: 1, max: 50, precio: 45 },
            { min: 51, max: 200, precio: 40 },
            { min: 201, max: null, precio: 35 }
          ],
          hiloExtra: { bn: 2, color: 3 },
          itlaSatinado: 30
        },
        tabloide: { satinado: { precio: 45 } }
      },
      tapaDura: {
        colores: {
          beige: 600,
          morado: 500,
          azul_marino: 500,
          azul_cielo: 500,
          rojo: 500,
          verde_botella: 500,
          amarillo_medicina: 500,
          blanco: 600
        },
        legal: 800,
        itla: 700
      },
      vinil: { carta: 1200, legal: 1200, tabloide: 1500 },
      encuadernado: [
        { min: 1, max: 50, precio: 60 },
        { min: 51, max: 80, precio: 70 },
        { min: 81, max: 100, precio: 100 },
        { min: 101, max: 150, precio: 120 },
        { min: 151, max: 200, precio: 150 },
        { min: 201, max: null, precio: 250 }
      ],
      servicios: { lomo: 50, cd: 200, redondeoMultiplo: 5 },
      entrega: { tapaDura: '6 horas', vinil: '24 horas' }
    },
    general: {
      impresion: {
        bn: {
          carta: [
            { min: 1, max: 50, precio: 2.5 },
            { min: 51, max: null, precio: 2 }
          ],
          legal: [
            { min: 1, max: 50, precio: 10 },
            { min: 51, max: 200, precio: 8 },
            { min: 201, max: null, precio: 6 }
          ],
          tabloide: [
            { min: 1, max: 50, precio: 20 },
            { min: 51, max: 200, precio: 15 },
            { min: 201, max: null, precio: 10 }
          ]
        },
        color: {
          carta: [
            { min: 1, max: 50, precio: 15 },
            { min: 51, max: 200, precio: 10 },
            { min: 201, max: null, precio: 8 }
          ],
          legal: [
            { min: 1, max: 50, precio: 30 },
            { min: 51, max: 200, precio: 25 },
            { min: 201, max: null, precio: 20 }
          ],
          tabloide: [
            { min: 1, max: 50, precio: 40 },
            { min: 51, max: 200, precio: 35 },
            { min: 201, max: null, precio: 30 }
          ]
        },
        fullColor: {
          carta: [
            { min: 1, max: 50, precio: 20 },
            { min: 51, max: 200, precio: 18 },
            { min: 201, max: null, precio: 15 }
          ],
          legal: [
            { min: 1, max: 50, precio: 35 },
            { min: 51, max: 200, precio: 30 },
            { min: 201, max: null, precio: 25 }
          ],
          tabloide: [
            { min: 1, max: 50, precio: 60 },
            { min: 51, max: 200, precio: 50 },
            { min: 201, max: null, precio: 40 }
          ]
        },
        especiales: {
          carta: [
            { min: 1, max: 50, precio: 35 },
            { min: 51, max: 200, precio: 30 },
            { min: 201, max: null, precio: 25 }
          ],
          legal: [
            { min: 1, max: 50, precio: 45 },
            { min: 51, max: 200, precio: 40 },
            { min: 201, max: null, precio: 35 }
          ],
          tabloide: [
            { min: 1, max: 50, precio: 70 },
            { min: 51, max: 200, precio: 60 },
            { min: 201, max: null, precio: 50 }
          ]
        }
      },
      encuadernado: [
        { min: 1, max: 50, precio: 60 },
        { min: 51, max: 80, precio: 70 },
        { min: 81, max: 100, precio: 100 },
        { min: 101, max: 150, precio: 120 },
        { min: 151, max: 200, precio: 150 },
        { min: 201, max: null, precio: 250 }
      ],
      empastado: {
        tapaDura: { carta: 500, legal: 800, tabloide: 1000 },
        tapaBlanda: { carta: 350 }
      },
      plastificado: { cedula: 30, carta: 40, legal: 50, tabloide: 60 },
      ploteo: {
        bondFullColor: { '17x22': 150, '18x24': 150, '24x36': 360 },
        bondColor: { '17x22': 75, '18x24': 75, '24x36': 180 },
        bondBN: { '17x22': 50, '18x24': 50, '24x36': 90 },
        bondPorPie: { bond_bn: 15, bond_color: 25, bond_full_color: 60 },
        porPie: { cartonite: 80, fotografico: 160, lona: 100, cintra: 250, canvas: 300 },
        fallbackPorPie: 100
      }
    },
    booklet: { bondBN: 2.5, bondColor: 15, cartonite: 150 }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDefaults(defaultValue, remoteValue) {
    if (typeof defaultValue === 'number') {
      return typeof remoteValue === 'number' ? remoteValue : defaultValue;
    }
    if (typeof defaultValue === 'string') {
      return typeof remoteValue === 'string' ? remoteValue : defaultValue;
    }
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(remoteValue) || remoteValue.length !== defaultValue.length) {
        return clone(defaultValue);
      }
      return defaultValue.map((item, index) => mergeDefaults(item, remoteValue[index]));
    }
    if (defaultValue && typeof defaultValue === 'object') {
      const source = remoteValue && typeof remoteValue === 'object' && !Array.isArray(remoteValue)
        ? remoteValue
        : {};
      return Object.keys(defaultValue).reduce((result, key) => {
        result[key] = mergeDefaults(defaultValue[key], source[key]);
        return result;
      }, {});
    }
    return defaultValue;
  }

  function collectValidationErrors(value, defaults, path, errors) {
    if (typeof defaults === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        errors.push(`${path}: debe ser un número finito no negativo.`);
      }
      return;
    }
    if (typeof defaults === 'string') {
      if (typeof value !== 'string' || !value.trim()) errors.push(`${path}: es obligatorio.`);
      return;
    }
    if (Array.isArray(defaults)) {
      if (!Array.isArray(value) || value.length !== defaults.length) {
        errors.push(`${path}: faltan rangos requeridos.`);
        return;
      }
      let expectedMin = 1;
      value.forEach((range, index) => {
        const label = `${path}, rango ${index + 1}`;
        if (!range || !Number.isSafeInteger(range.min) || range.min !== expectedMin) {
          errors.push(`${label}: el inicio debe ser ${expectedMin}.`);
        }
        if (!(range.max === null || (Number.isSafeInteger(range.max) && range.max >= range.min))) {
          errors.push(`${label}: el fin debe ser mayor o igual al inicio, o estar vacío si no tiene límite.`);
        }
        if (typeof range.precio !== 'number' || !Number.isFinite(range.precio) || range.precio < 0) {
          errors.push(`${label}: el precio debe ser finito y no negativo.`);
        }
        if (index === value.length - 1) {
          if (range.max !== null) errors.push(`${label}: el último rango debe quedar sin límite.`);
        } else if (range.max === null) {
          errors.push(`${label}: solo el último rango puede quedar sin límite.`);
        } else {
          expectedMin = range.max + 1;
        }
      });
      return;
    }
    if (defaults && typeof defaults === 'object') {
      Object.keys(defaults).forEach(key => {
        collectValidationErrors(value && value[key], defaults[key], `${path}.${key}`, errors);
      });
    }
  }

  function validate(catalog) {
    const errors = [];
    collectValidationErrors(catalog, DEFAULTS, 'precios', errors);
    if (!catalog?.tesis?.servicios || catalog.tesis.servicios.redondeoMultiplo <= 0) {
      errors.push('precios.tesis.servicios.redondeoMultiplo: debe ser mayor que cero.');
    }
    return errors;
  }

  function buildCatalog(remote, legacyBooklet) {
    const catalog = mergeDefaults(DEFAULTS, remote);
    if (legacyBooklet && typeof legacyBooklet === 'object') {
      ['bondBN', 'bondColor', 'cartonite'].forEach(key => {
        const centralValue = remote?.booklet?.[key];
        const value = Number(legacyBooklet[key]);
        if (centralValue === undefined || centralValue === null) {
          if (Number.isFinite(value) && value >= 0) catalog.booklet[key] = value;
        }
      });
    }
    return catalog;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEFAULTS, buildCatalog, validate };
    return;
  }

  const listeners = new Set();
  let catalog = clone(DEFAULTS);
  let centralData = null;
  let legacyBookletData = null;
  let centralLoaded = false;
  let legacyLoaded = false;
  let readError = '';
  let centralRef = null;
  let db = null;
  let auth = null;

  function currentStatus() {
    if (readError) {
      return { ready: false, message: `No se pudo leer Firebase (${readError}). Se mantienen los valores iniciales; el guardado está deshabilitado.` };
    }
    if (!centralLoaded || !legacyLoaded) {
      return { ready: false, message: 'Cargando precios compartidos…' };
    }
    return { ready: true, message: 'Precios sincronizados con Firebase' };
  }

  function emit() {
    const status = currentStatus();
    listeners.forEach(listener => listener(clone(catalog), status));
  }

  function describeFirebaseError(error, operation) {
    const message = error?.message || 'error desconocido';
    if (error?.code === 'PERMISSION_DENIED' || message.includes('permission_denied')) {
      return `las reglas de Realtime Database denegaron ${operation}; verifica lectura y el claim admin: true para escritura`;
    }
    return message;
  }

  function refreshCatalog() {
    const next = buildCatalog(centralData, legacyBookletData);
    const errors = validate(next);
    if (errors.length) {
      readError = `la configuración remota no es válida (${errors[0]})`;
      console.error('[Precios] Se conserva la última configuración válida:', errors);
    } else {
      readError = '';
      catalog = next;
    }
    emit();
  }

  function start() {
    if (!root.firebase || !root.firebase.database || !root.firebase.auth) {
      readError = 'Firebase no está disponible en esta página.';
      console.error('[Precios] Firebase compat no está disponible.');
      emit();
      return;
    }

    try {
      if (!root.firebase.apps.length) {
        root.firebase.initializeApp({
          apiKey: 'AIzaSyBgVrMPSwZg3O5zbuIozstpG0bM8XFEeZE',
          authDomain: 'servigaco.firebaseapp.com',
          databaseURL: 'https://servigaco-default-rtdb.firebaseio.com',
          projectId: 'servigaco',
          storageBucket: 'servigaco.firebasestorage.app',
          messagingSenderId: '516579834487',
          appId: '1:516579834487:web:e7fb1c46d93bb62a98a472'
        });
      }
      db = root.firebase.database();
      auth = root.firebase.auth();
      centralRef = db.ref('config/precios_app');

      centralRef.on('value', snapshot => {
        centralData = snapshot.val();
        centralLoaded = true;
        refreshCatalog();
      }, error => {
        readError = describeFirebaseError(error, 'la lectura de config/precios_app');
        console.error('[Precios] Error leyendo config/precios_app:', error);
        emit();
      });

      db.ref('config/precios_booklet').on('value', snapshot => {
        legacyBookletData = snapshot.val();
        legacyLoaded = true;
        refreshCatalog();
      }, error => {
        readError = describeFirebaseError(error, 'la lectura de config/precios_booklet');
        console.error('[Precios] Error leyendo config/precios_booklet:', error);
        emit();
      });
    } catch (error) {
      readError = error.message || 'no se pudo iniciar Firebase';
      console.error('[Precios] Error iniciando sincronización de precios:', error);
      emit();
    }
  }

  const api = {
    defaults: clone(DEFAULTS),
    validate,
    get() {
      return clone(catalog);
    },
    getStatus: currentStatus,
    onChange(listener) {
      listeners.add(listener);
      listener(clone(catalog), currentStatus());
      return () => listeners.delete(listener);
    },
    isAdmin() {
      return auth ? auth.currentUser : null;
    },
    async save(nextCatalog) {
      if (!centralRef || !auth) throw new Error('Firebase todavía no está disponible.');
      if (!centralLoaded || !legacyLoaded || readError) {
        throw new Error('No se puede guardar hasta que la configuración remota se haya leído correctamente.');
      }
      const errors = validate(nextCatalog);
      if (errors.length) throw new Error(errors[0]);
      const user = auth.currentUser;
      if (!user) throw new Error('Inicia sesión con una cuenta administradora para guardar.');
      const token = await user.getIdTokenResult(true);
      if (token.claims.admin !== true) throw new Error('Tu cuenta no tiene el claim de administrador requerido.');

      const payload = clone(nextCatalog);
      payload.actualizadoEn = root.firebase.database.ServerValue.TIMESTAMP;
      try {
        await centralRef.set(payload);
      } catch (error) {
        throw new Error(describeFirebaseError(error, 'la escritura de config/precios_app'));
      }
    }
  };

  root.ServigacoPricing = api;
  start();
})(typeof window !== 'undefined' ? window : globalThis);
