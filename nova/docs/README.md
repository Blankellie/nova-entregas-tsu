# Nova Entregas – Front end
Ejecutar: `cd nova && python3 -m http.server 8000` → http://localhost:8000
Conectar backend: en `js/services/api.js` poner `USE_MOCK = false` y ajustar `API_BASE_URL`.
Endpoints usados: GET /zonas, GET /tasa-bcv, POST /contacto (contratos en comentarios de api.js).
## SQL base (MySQL/PostgreSQL)
```sql
CREATE TABLE zonas(id INT PRIMARY KEY, nombre VARCHAR(80) NOT NULL);
CREATE TABLE tarifas(id INT PRIMARY KEY, zona_id INT REFERENCES zonas(id), km_desde DECIMAL(4,1), km_hasta DECIMAL(4,1), precio_usd DECIMAL(6,2));
CREATE TABLE tasas_bcv(id INT PRIMARY KEY, fecha DATE UNIQUE, bs_por_usd DECIMAL(12,4));
CREATE TABLE mensajes_contacto(id INT PRIMARY KEY, nombre VARCHAR(80), correo VARCHAR(120), mensaje TEXT, creado TIMESTAMP);
INSERT INTO zonas VALUES(1,'Zona Este - Norte');
INSERT INTO tarifas VALUES(1,1,0,2,1.5),(2,1,2.1,5,2),(3,1,5.1,8,3);
```

## Dónde se edita cada cosa
- **Precios del delivery y tasa BCV del día:** `admin.html` (usuario de prueba `admin` / `nova123`). Con backend real: `PUT /api/zonas` y `PUT /api/tasa-bcv`.
- **Activar `USE_MOCK = false`, URL del backend y API key de Google Maps:** `js/config.js`.
- **Dónde se calcula el precio (km × tarifa × tasa):** `calcularPrecio()` en `js/main.js`.
- **Teléfonos, correo, Instagram, WhatsApp:** sección CONTACTO de `index.html`.
- Tablas extra para la tasa manual: `tasas_bcv(id, fecha, bs_por_usd, creado_por)`; la API devuelve la fila más reciente.
