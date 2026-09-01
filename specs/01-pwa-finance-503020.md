# SPEC 01 — PWA Finanzas 50/30/20 Venezuela

> **Status:** implementado
> **Depends on:** —
> **Date:** 2026-09-01
> **Objective:** PWA de finanzas personales que registra gastos en VES, los convierte a USD vía API BCV, y aplica la regla 50/30/20 con alertas visuales de presupuesto.

---

## Scope

**In:**

- Formulario de gasto: monto VES, tasa editable, descripción, categoría (need/want/saving)
- Conversión en tiempo real VES→USD con tasa de API BCV y fallback manual
- Smart selector de categorías con matching parcial de sinónimos
- 3 barras de progreso (Necesidades 50%, Deseos 30%, Ahorro 20%)
- Alerta visual cuando se supera el límite de una categoría
- Ingreso mensual configurable (una vez al mes)
- Persistencia en Google Sheets vía Google Apps Script (GAS)
- PWA instalable (manifest.json + service worker básico)
- Deploy en Firebase Hosting (estático)

**Out of scope (for future specs):**

- Autenticación de usuario
- Multi-usuario o sincronización entre dispositivos
- Offline-first con caché de datos
- Notificaciones push
- Historial de meses anteriores
- Exportación de datos
- Gráficas o reportes avanzados

---

## Data model

### Google Sheets — Hoja "Gastos"

| Columna | Tipo | Ejemplo |
|---------|------|---------|
| A: Fecha | Date | 2026-09-01 |
| B: Descripción | String | "Mercado Central" |
| C: Categoría | Enum | `need` / `want` / `saving` |
| D: Subcategoría | String | "Alimentación" |
| E: Monto VES | Number | 45000 |
| F: Tasa USD | Number | 36.50 |
| G: Monto USD | Number | 1232.88 |

### Google Sheets — Hoja "Config"

| Columna | Tipo | Ejemplo |
|---------|------|---------|
| A: Clave | String | `ingreso_mensual_usd` |
| B: Valor | String | `800` |

### Google Sheets — Hoja "MesActual"

| Columna | Tipo | Ejemplo |
|---------|------|---------|
| A: Categoría | Enum | `need` / `want` / `saving` |
| B: Total USD | Number | 320.50 |
| C: Límite USD | Number | 400.00 |
| D: %Usado | Number | 80.13 |

### GAS — Respuesta JSON

```json
{
  "success": true,
  "alerts": [
    {
      "category": "want",
      "label": "Deseos",
      "spent": 260.00,
      "limit": 240.00,
      "over": 20.00,
      "message": "⚠️ Superaste tu presupuesto de Deseos por $20.00 USD"
    }
  ],
  "summary": {
    "need": { "spent": 320.50, "limit": 400.00, "pct": 80.13 },
    "want": { "spent": 260.00, "limit": 240.00, "pct": 108.33 },
    "saving": { "spent": 150.00, "limit": 160.00, "pct": 93.75 }
  }
}
```

### Smart Selector — Mapa de sinónimos

```js
const SYNONYM_MAP = {
  need: ["mercado", "supermercado", "alimentación", "carnicería", "frutería",
         "transporte", "gasolina", "bus", "metro", "alquiler", "arriendo",
         "servicio", "electricidad", "agua", "internet", "salud", "farmacia",
         "médico", "educación", "colegio", "universidad"],
  want: ["cine", "restaurante", "café", "bar", "discoteca", "suscripción",
         "netflix", "spotify", "ropa", "zapatos", "tecnología", "gadget",
         "videojuego", "hobby", "deporte", "gimnasio", "salida", "viaje"],
  saving: ["ahorro", "inversión", "deuda", "préstamo",
           "tarjeta", "crédito", "fondo", "emergencia"]
};
```

---

## Implementation plan

### Fase 1 — Backend GAS (Google Apps Script)

1. Crear proyecto GAS vinculado a Google Sheets con 3 hojas (Gastos, Config, MesActual).
2. Implementar `doPost(e)` que recibe JSON, escribe fila en "Gastos", recalcula "MesActual", retorna JSON con alerts y summary.
3. Implementar `doGet()` para leer Config (ingreso mensual) y MesActual (barras de progreso).
4. Desplegar como Web App con acceso público (ejecutar como propietario, quien accede: cualquiera).
5. Anotar el URL del endpoint desplegado.

**Verificación:** Hacer POST manual con curl al endpoint, verificar que la fila se escribe en Sheets y el JSON de respuesta tiene alerts correctas.

### Fase 2 — Frontend: Estructura y formulario

6. Configurar proyecto Bun + React existente para PWA: agregar `public/manifest.json` y `public/sw.js`.
7. Crear componente `ExpenseForm.tsx` con campos: monto VES, tasa (editable, default API BCV), descripción, categoría (select con smart selector).
8. Implementar conversión en tiempo real VES→USD en el formulario (useEffect que calcula `montoVES / tasa`).
9. Implementar `SmartCategorySelector` que sugiere categoría basado en texto de descripción usando SYNONYM_MAP.
10. Crear servicio `api.ts` con función `submitExpense(data)` que hace POST al endpoint GAS.

**Verificación:** Abrir formulario, escribir "mercado 45000", verificar que categoría se sugiere como "need" y el monto USD se calcula en vivo.

### Fase 3 — Frontend: Dashboard y alertas

11. Crear componente `BudgetDashboard.tsx` con 3 barras de progreso (need/want/saving).
12. Implementar fetch a GAS `doGet()` para leer MesActual y Config al cargar la página.
13. Calcular y mostrar % de consumo por categoría con colores: verde (<70%), naranja (70-99%), rojo (≥100%).
14. Crear componente `AlertToast.tsx` para mostrar alertas de sobregasto (se muestra cuando POST retorna alerts).
15. Integrar formulario + dashboard en `App.tsx` con layout mobile-first.

**Verificación:** Enviar gasto que exceda límite, verificar que aparece toast de alerta y la barra de progreso cambia a rojo.

### Fase 4 — PWA y deploy

16. Configurar `manifest.json` con nombre "Tasa5030", display standalone, colores, iconos.
17. Implementar `sw.js` con estrategia cache-first para assets estáticos.
18. Registrar service worker en `frontend.tsx`.
19. Configurar `firebase.json` para Hosting (servir `dist/`).
20. Ejecutar `bun run build` y desplegar con `firebase deploy`.

**Verificación:** Abrir en móvil, verificar que se puede instalar como PWA, que los assets se cachean.

---

## Acceptance criteria

- [ ] El formulario calcula monto USD en tiempo al modificar monto VES o tasa
- [ ] La categoría se sugiere automáticamente al escribir en el campo descripción
- [ ] El endpoint GAS recibe POST, escribe en Sheets, retorna JSON con alerts y summary
- [ ] Las 3 barras de progreso muestran el consumo actual vs límite
- [ ] Las barras cambian de color según porcentaje (verde/naranja/rojo)
- [ ] Si se excede el límite de una categoría, aparece un toast de alerta
- [ ] El ingreso mensual se guarda en Config y se lee al cargar
- [ ] La PWA muestra manifest.json y el service worker se registra
- [ ] La app se despliega en Firebase Hosting y es accesible públicamente
- [ ] Sin errores en consola del navegador al cargar y usar la app

---

## Decisions

- **Yes:** Google Sheets como base de datos (gratis, sin setup de servidor, el usuario ya lo tiene).
- **No:** Firebase Firestore. Más complejidad de setup, no es necesario para un solo usuario.
- **Yes:** GAS como backend API. Maneja la lógica de escritura/lectura de Sheets sin exponer credenciales.
- **No:** Bun serve() como backend en producción. GAS reemplaza las rutas API; Bun solo sirve para dev local.
- **Yes:** 3 hojas separadas (Gastos, Config, MesActual). Evita re-leer toda la hoja de gastos para cada operación.
- **No:** Una sola hoja con todo. Lentitud al escalar y难难难读.
- **Yes:** Tasa de cambio editable con default de API BCV. Flexibilidad cuando la API falla.
- **No:** Solo tasa manual. El usuario no quiere buscar la tasa cada vez.
- **Yes:** Smart selector con mapa estático de sinónimos. Simple, rápido, sin dependencias externas.
- **No:** Matching con IA/ML. Overengineering para esta etapa.
- **Yes:** Alertas visuales solamente. Las push notifications requieren permisos y server-side logic.
- **No:** Offline-first. Requiere caché de datos complejo, deferred a spec futuro.

---

## Risks

| Risk | Mitigation |
|------|------------|
| API BCV caída o cambia endpoint | Fallback a tasa manual editable. El usuario ingresa la tasa si la API falla |
| GAS quotas (6 minutos/execución) | Operaciones simples (<100 filas), no debería alcanzar el límite |
| Google Sheets lento con muchos datos | MesActual se recalcula por GAS, no por frontend. Lectura de 3 filas máximo |
| CORS en GAS | Usar `doPost` con `Content-Type: application/json` y `Access-Control-Allow-Origin: *` en GAS |

---

## What is **not** in this spec

- Autenticación de usuario
- Multi-usuario o sincronización
- Offline-first o caché de datos
- Notificaciones push
- Historial de meses anteriores
- Exportación de datos (CSV, PDF)
- Gráficas o reportes avanzados
- Integración con bancos o APIs de terceros (además de BCV)

Cada uno de estos, si se implementa, va en su propio spec.
