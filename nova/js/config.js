// =====================================================================
// config.js  -  AJUSTES GENERALES DEL SITIO
// Este es el primer archivo que debes tocar cuando conectes todo.
// =====================================================================

// >>> AQUÍ CAMBIAS A LA BASE DE DATOS REAL <<<
// true  = usa datos de prueba (se guardan en el navegador, sin backend)
// false = usa tu backend de verdad (API_BASE_URL)
export const USE_MOCK = true;

// Dirección de tu backend (donde corre la API que habla con la base de datos)
export const API_BASE_URL = 'http://localhost:3000/api';

// >>> AQUÍ PEGAS LA API KEY DE GOOGLE MAPS <<<
// Se saca en https://console.cloud.google.com  (activar: "Maps JavaScript API",
// "Places API" y "Directions API"). Mientras esté vacía, el cotizador funciona
// escribiendo los km a mano.
export const GOOGLE_MAPS_API_KEY = '';

// Datos de prueba del login del administrador (solo se usan con USE_MOCK = true).
// Con backend real esto se valida en el servidor, NUNCA en el navegador.
export const ADMIN_MOCK = { usuario: 'admin', clave: 'nova123' };
