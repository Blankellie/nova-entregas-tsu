// main.js - lógica de la página principal de Nova Entregas
// Aquí solo va lo que toca la pantalla. Los datos vienen de services/api.js,
// así cuando conectemos la base de datos este archivo casi no cambia.

import { getZonasPrecios, getTasaBCV, enviarContacto } from './services/api.js';
import { GOOGLE_MAPS_API_KEY } from './config.js';

const $ = (selector) => document.querySelector(selector); // atajo

// Da formato venezolano a los bolívares: 1234.5 -> "1.234,50"
function formatearBs(monto) {
  return monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------
   NAVBAR
------------------------------------------------------------------ */
const nav = $('.nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });

$('.burger').addEventListener('click', (e) => {
  const abierto = nav.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', abierto); // para lectores de pantalla
});

// Resalta en amarillo el enlace de la sección que se está viendo
const enlaces = [...document.querySelectorAll('.nav a[href^="#"]')];
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((en) => {
    if (en.isIntersecting) enlaces.forEach((a) => a.classList.toggle('active', a.hash === '#' + en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => observador.observe(s));
enlaces.forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));

/* ------------------------------------------------------------------
   DATOS DE PRECIOS Y TASA
   Vienen de la base de datos (vía api.js). Se guardan en "datos" para
   usarlos tanto en las tarjetas como en el cotizador.
------------------------------------------------------------------ */
const datos = { zona: null, tasa: null };

async function cargarDatos() {
  const [zonas, tasa] = await Promise.all([getZonasPrecios(), getTasaBCV()]);
  datos.zona = zonas[0]; // por ahora solo hay una zona (Este - Norte); más zonas = más elementos del arreglo
  datos.tasa = tasa;
}

// >>> AQUÍ SE CALCULA EL PRECIO DEL DELIVERY <<<
// precio en $  = el de la tarifa donde cae el km  (tabla que edita el admin)
// precio en Bs = precio en $  x  tasa BCV del día (la que escribe el admin)
function calcularPrecio(km) {
  const kmRedondeado = Math.round(km * 10) / 10; // los rangos van de 0.1 en 0.1 (2 km -> 2.1 km)
  const tarifa = datos.zona.tarifas.find((t) => kmRedondeado >= t.desde && kmRedondeado <= t.hasta);
  if (!tarifa) return null; // fuera de cobertura
  return { usd: tarifa.usd, bs: tarifa.usd * datos.tasa.bs_por_usd };
}

/* ------------------------------------------------------------------
   TABLA DE PRECIOS (tarjetas que voltean)
------------------------------------------------------------------ */
function pintarPrecios() {
  const contenedor = $('#tarjetas');
  $('#zona-nombre').textContent = datos.zona.nombre.toUpperCase();

  // La fecha viene como 2026-10-08, la mostramos como 08/10/2026
  const fecha = datos.tasa.fecha.split('-').reverse().join('/');
  $('#tasa-info').textContent = `Tasa BCV del ${fecha}: Bs ${formatearBs(datos.tasa.bs_por_usd)}`;

  // Una tarjeta por tarifa: adelante en dólares, atrás en bolívares (con la tasa del día)
  contenedor.innerHTML = datos.zona.tarifas.map((t) => `
    <button class="flip" aria-label="Rango ${t.desde} a ${t.hasta} km, ${t.usd} dólares. Toca para ver en bolívares">
      <span class="cara frente">
        <span class="rango">RANGO<br>${t.desde}KM A ${t.hasta}KM</span>
        <strong class="monto"><i>$</i>${t.usd}</strong>
      </span>
      <span class="cara dorso">
        <span class="rango">PRECIO BCV<br>DEL DÍA</span>
        <strong class="monto bs"><i>Bs</i>${formatearBs(t.usd * datos.tasa.bs_por_usd)}</strong>
      </span>
    </button>`).join('');

  // En PC voltea con hover (lo hace el CSS). En el celular no hay hover, así que con toque:
  contenedor.querySelectorAll('.flip').forEach((tarjeta) => {
    tarjeta.addEventListener('click', () => tarjeta.classList.toggle('voltea'));
  });
}

const datosListos = cargarDatos().then(pintarPrecios).catch((error) => {
  console.error(error);
  $('#tarjetas').innerHTML = '<p>No pudimos cargar los precios. Intenta de nuevo en un momento.</p>';
});

/* ------------------------------------------------------------------
   MAPA (Leaflet + OpenStreetMap, no pide API key)
------------------------------------------------------------------ */
const mapa = L.map('mapa', { scrollWheelZoom: false }).setView([10.6427, -71.6125], 12); // centro de Maracaibo
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapa);

// Círculo aproximado de la Zona Este - Norte (no es el límite exacto)
L.circle([10.6700, -71.6150], { radius: 4500, color: '#FFC82C', fillOpacity: 0.12 })
  .addTo(mapa).bindTooltip('Zona Este - Norte (aprox.)');

// Capa donde se dibuja la ruta (se limpia y se vuelve a dibujar en cada cotización)
const capaRuta = L.layerGroup().addTo(mapa);
// Ruta de ejemplo para que el mapa no se vea vacío antes de cotizar
dibujarRuta([[10.6667, -71.6120], [10.6300, -71.6300]]);

function dibujarRuta(puntos) {
  capaRuta.clearLayers();
  L.marker(puntos[0]).addTo(capaRuta).bindPopup('Origen');
  L.marker(puntos[puntos.length - 1]).addTo(capaRuta).bindPopup('Destino');
  const linea = L.polyline(puntos, { color: '#1A00AB', weight: 5 }).addTo(capaRuta);
  mapa.fitBounds(linea.getBounds(), { padding: [30, 30] });
}

/* ------------------------------------------------------------------
   GOOGLE MAPS (autocompletar direcciones + calcular km por la ruta real)
   Solo se carga si hay API key en js/config.js
------------------------------------------------------------------ */
let googleListo = false;

function cargarGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) return; // sin key: el cotizador usa los km escritos a mano
  window.iniciarGoogle = () => {
    googleListo = true;
    // Sugerencias de direcciones, solo en Venezuela
    const opciones = { componentRestrictions: { country: 've' }, fields: ['formatted_address', 'geometry'] };
    new google.maps.places.Autocomplete($('#origen'), opciones);
    new google.maps.places.Autocomplete($('#destino'), opciones);
  };
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=es&region=VE&callback=iniciarGoogle`;
  s.async = true;
  document.head.appendChild(s);
}
cargarGoogleMaps();

// Le pregunta a Google la ruta entre las dos direcciones y devuelve { km, puntos }
function rutaConGoogle(origen, destino) {
  return new Promise((resolver, rechazar) => {
    new google.maps.DirectionsService().route(
      { origin: origen, destination: destino, travelMode: 'DRIVING' },
      (resultado, estado) => {
        if (estado !== 'OK') return rechazar(new Error('No encontramos esa ruta'));
        const metros = resultado.routes[0].legs[0].distance.value;
        const puntos = resultado.routes[0].overview_path.map((p) => [p.lat(), p.lng()]);
        resolver({ km: metros / 1000, puntos });
      });
  });
}

/* ------------------------------------------------------------------
   COTIZADOR
------------------------------------------------------------------ */
function mostrarResultado(km) {
  const salida = $('#cot-res');
  if (isNaN(km)) { salida.textContent = ''; return; }
  const precio = calcularPrecio(km);
  salida.textContent = precio
    ? `Distancia: ${km.toFixed(1)} km · Total: $${precio.usd} · Bs ${formatearBs(precio.bs)}`
    : 'Fuera de cobertura (máximo 8 km). Escríbenos y lo resolvemos.';
}

// Si escriben los km a mano, actualizamos el precio al instante
$('#km').addEventListener('input', async () => {
  await datosListos;
  mostrarResultado(parseFloat($('#km').value));
});

// Al darle a "Cotiza tu Envío": si hay Google y dos direcciones, calculamos los km por la ruta real
$('#cotizador').addEventListener('submit', async (e) => {
  e.preventDefault();
  await datosListos;
  const origen = $('#origen').value.trim(), destino = $('#destino').value.trim();

  if (googleListo && origen && destino) {
    try {
      const { km, puntos } = await rutaConGoogle(origen, destino);
      $('#km').value = km.toFixed(1);
      dibujarRuta(puntos);
      mostrarResultado(km);
    } catch (err) { $('#cot-res').textContent = err.message + '. Revisa las direcciones.'; }
    return;
  }
  mostrarResultado(parseFloat($('#km').value)); // sin Google: usamos los km escritos
});

/* ------------------------------------------------------------------
   FORMULARIO DE CONTACTO
------------------------------------------------------------------ */
$('#form-contacto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formulario = e.target, estado = $('#estado');

  // Validación del navegador. Ojo: el backend TAMBIÉN tiene que validar.
  if (!formulario.checkValidity()) {
    estado.textContent = 'Revisa los campos marcados.';
    formulario.reportValidity();
    return;
  }
  estado.textContent = 'Enviando…';
  try {
    await enviarContacto(Object.fromEntries(new FormData(formulario)));
    estado.textContent = '¡Listo! Te escribimos pronto.';
    formulario.reset();
  } catch (error) {
    console.error(error);
    estado.textContent = 'Ocurrió un error. Intenta de nuevo.';
  }
});

$('#anio').textContent = new Date().getFullYear(); // año del footer
