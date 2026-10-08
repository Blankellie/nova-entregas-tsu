// =====================================================================
// api.js  -  CAPA DE SERVICIOS
// Todo lo que sea pedir o guardar datos pasa por este archivo.
// Con USE_MOCK = true los datos se guardan en el navegador (localStorage);
// con USE_MOCK = false se llama al backend (API_BASE_URL).
// =====================================================================
import { USE_MOCK, API_BASE_URL, ADMIN_MOCK } from '../config.js';
export { USE_MOCK, API_BASE_URL };

// Función genérica para hablar con el backend (solo si USE_MOCK es false)
async function http(ruta, opciones = {}) {
  const r = await fetch(API_BASE_URL + ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  if (!r.ok) throw new Error('Error ' + r.status);
  return r.json();
}
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms)); // simula que el servidor tarda

// Mini ayudas para guardar en el navegador (solo modo prueba)
const leer = (clave) => { try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; } };
const guardar = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {} };

// ---------------------------------------------------------------------
// PRECIOS DEL DELIVERY (zonas y tarifas por rango de km)
// GET /api/zonas  ->  [{ id, nombre, tarifas:[{ id, desde, hasta, usd }] }]
// ---------------------------------------------------------------------
export async function getZonasPrecios() {
  if (!USE_MOCK) return http('/zonas');
  return leer('nova_zonas') || (await fetch('data/zonas.json')).json();
}

// PUT /api/zonas  (solo admin)  body: el mismo arreglo de arriba  ->  { ok:true }
// Aquí el administrador guarda los precios del delivery (los edita en admin.html)
export async function guardarZonasPrecios(zonas) {
  if (!USE_MOCK) return http('/zonas', { method: 'PUT', body: JSON.stringify(zonas) });
  await espera(300); guardar('nova_zonas', zonas); return { ok: true };
}

// ---------------------------------------------------------------------
// TASA BCV DEL DÍA (la escribe el administrador a mano)
// GET /api/tasa-bcv  ->  { bs_por_usd: 36.5, fecha: '2026-10-08' }
// ---------------------------------------------------------------------
export async function getTasaBCV() {
  if (!USE_MOCK) return http('/tasa-bcv');
  await espera(200);
  return leer('nova_tasa') || { bs_por_usd: 36.5, fecha: new Date().toISOString().slice(0, 10) };
}

// PUT /api/tasa-bcv  (solo admin)  body: { bs_por_usd: 36.5 }  ->  { bs_por_usd, fecha }
// Aquí el administrador guarda la tasa del día. La fecha la pone el servidor (hoy).
export async function setTasaBCV(bsPorUsd) {
  if (!USE_MOCK) return http('/tasa-bcv', { method: 'PUT', body: JSON.stringify({ bs_por_usd: bsPorUsd }) });
  await espera(300);
  const tasa = { bs_por_usd: bsPorUsd, fecha: new Date().toISOString().slice(0, 10) };
  guardar('nova_tasa', tasa); return tasa;
}

// ---------------------------------------------------------------------
// LOGIN DEL ADMIN
// POST /api/login  body: { usuario, clave }  ->  { token }
// ---------------------------------------------------------------------
export async function login(usuario, clave) {
  if (!USE_MOCK) return http('/login', { method: 'POST', body: JSON.stringify({ usuario, clave }) });
  await espera(300);
  if (usuario === ADMIN_MOCK.usuario && clave === ADMIN_MOCK.clave) return { token: 'token-de-prueba' };
  throw new Error('Usuario o clave incorrectos');
}

// ---------------------------------------------------------------------
// CONTACTO
// POST /api/contacto  body: { nombre, correo, mensaje }  ->  { ok:true }
// ---------------------------------------------------------------------
export async function enviarContacto(data) {
  if (!USE_MOCK) return http('/contacto', { method: 'POST', body: JSON.stringify(data) });
  await espera(600); return { ok: true };
}
