// admin.js - lógica del panel de administración (admin.html)
// Solo habla con services/api.js, igual que la página principal.
import { login, getTasaBCV, setTasaBCV, getZonasPrecios, guardarZonasPrecios } from './services/api.js';

const $ = (s) => document.querySelector(s);
let zonas = []; // copia de las zonas que estamos editando

// ---- Login ----
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const { token } = await login(f.get('usuario'), f.get('clave'));
    sessionStorage.setItem('nova_token', token); // con backend real, este token se manda en cada petición
    abrirPanel();
  } catch (err) { $('#login-estado').textContent = err.message; }
});

async function abrirPanel() {
  $('#login').hidden = true; $('#panel').hidden = false;
  const tasa = await getTasaBCV();
  $('#tasa').value = tasa.bs_por_usd;
  zonas = await getZonasPrecios();
  $('#zona-nombre').value = zonas[0].nombre;
  pintarFilas();
}
if (sessionStorage.getItem('nova_token')) abrirPanel(); // si ya entró antes, no pedimos clave otra vez

// ---- Guardar la tasa del día ----
$('#form-tasa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const valor = parseFloat($('#tasa').value);
  if (!(valor > 0)) { $('#tasa-estado').textContent = 'Escribe una tasa mayor a 0.'; return; }
  const t = await setTasaBCV(valor);
  $('#tasa-estado').textContent = `Tasa guardada: Bs ${t.bs_por_usd} (${t.fecha}).`;
});

// ---- Tabla editable de precios ----
function pintarFilas() {
  $('#filas').innerHTML = zonas[0].tarifas.map((t, i) => `
    <tr>
      <td><input type="number" step="0.1" min="0" value="${t.desde}" data-i="${i}" data-campo="desde" aria-label="Desde"></td>
      <td><input type="number" step="0.1" min="0" value="${t.hasta}" data-i="${i}" data-campo="hasta" aria-label="Hasta"></td>
      <td><input type="number" step="0.01" min="0" value="${t.usd}" data-i="${i}" data-campo="usd" aria-label="Precio en dólares"></td>
      <td><button type="button" data-borrar="${i}" aria-label="Quitar rango">✕</button></td>
    </tr>`).join('');
}
$('#filas').addEventListener('input', (e) => {
  const { i, campo } = e.target.dataset;
  if (campo) zonas[0].tarifas[i][campo] = parseFloat(e.target.value);
});
$('#filas').addEventListener('click', (e) => {
  if (e.target.dataset.borrar === undefined) return;
  zonas[0].tarifas.splice(e.target.dataset.borrar, 1); pintarFilas();
});
$('#agregar').addEventListener('click', () => {
  const t = zonas[0].tarifas, ultimo = t[t.length - 1];
  t.push({ id: Date.now(), desde: ultimo ? +(ultimo.hasta + 0.1).toFixed(1) : 0, hasta: ultimo ? ultimo.hasta + 3 : 2, usd: 0 });
  pintarFilas();
});
$('#guardar-precios').addEventListener('click', async () => {
  zonas[0].nombre = $('#zona-nombre').value.trim();
  const mal = zonas[0].tarifas.some((t) => [t.desde, t.hasta, t.usd].some(isNaN) || t.hasta < t.desde);
  if (mal) { $('#precios-estado').textContent = 'Revisa los rangos: hay campos vacíos o "hasta" menor que "desde".'; return; }
  await guardarZonasPrecios(zonas);
  $('#precios-estado').textContent = 'Precios guardados. Ya se ven en el sitio.';
});
