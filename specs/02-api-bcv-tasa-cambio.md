# SPEC 02 — Integración API BCV para tasa de cambio USD/VES

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-01
> **Objective:** Obtener la tasa de cambio USD/VES del BCV automáticamente a través de GAS como proxy, con caché diario y fallback a tasa manual.

---

## Scope

**In:**

- Proxy en GAS que consulta `https://ve.dolarapi.com/v1/dolares/oficial` y retorna la tasa
- Almacenar la tasa del día en la hoja "Config" de Google Sheets (clave `tasa_usd_hoy`)
- Frontend lee la tasa del GAS al cargar la app y la muestra en el header
- El campo de tasa en `ExpenseForm` se prellena con la tasa del día (editable)
- Fallback: si la API falla → usar última tasa cacheada en Sheets; si no hay cache → habilitar campo manual con aviso
- Consulta una vez al día (la primera vez que se abre la app o se hace un request)

**Out of scope (for future specs):**

- Historial de tasas de cambio
- Gráfica de tendencia de tasa
- Conversión automática de ingresos USD→VES
- Multi-moneda (EUR, etc.)
- Notificación push cuando cambia la tasa

---

## Data model

### Google Sheets — Hoja "Config" (columnas existentes, se agrega una fila)

| Clave | Valor | Descripción |
|-------|-------|-------------|
| `ingreso_mensual_usd` | `800` | (existente) Ingreso mensual del usuario |
| `mes_actual` | `2026-09` | (existente) Mes en curso |
| `tasa_usd_hoy` | `36.50` | **Nueva.** Tasa de cambio del día |
| `tasa_fecha` | `2026-09-01` | **Nueva.** Fecha de la última consulta |

### GAS — Nuevas funciones

```js
function getTasaDelDia()        // Retorna la tasa del día (consulta API o cache)
function fetchYTasaFromBCV()    // Consulta pydolarve.org y guarda en Config
function isTasaCacheFresh()     // Verifica si la tasa cacheada es de hoy
```

### GAS — Respuesta de `doGet()` (se extiende)

```json
{
  "success": true,
  "summary": { ... },
  "alerts": [ ... ],
  "tasa": {
    "valor": 36.50,
    "fuente": "bcv",
    "fecha": "2026-09-01",
    "manual": false
  }
}
```

### Frontend — Tipo nuevo

```ts
interface TasaInfo {
  valor: number | null;
  fuente: "bcv" | "cache" | "manual";
  fecha: string;
  manual: boolean;
}
```

---

## Implementation plan

### Fase 1 — Backend GAS: proxy de tasa

1. Agregar `fetchYTasaFromBCV()` en `gas/code.gs` — HTTP GET a pydolarve.org, extrae tasa, guarda en Config.
2. Agregar `isTasaCacheFresh()` — compara `tasa_fecha` con fecha actual.
3. Agregar `getTasaDelDia()` — si cache fresca → retorna cache; si no → consulta API. Fallback: cache vieja o `{ valor: null, manual: true }`.
4. Modificar `doGet()` para incluir campo `tasa` en la respuesta.
5. **Verificación:** GET al endpoint, respuesta incluye `tasa` con valor numérico y `fuente: "bcv"`.

### Fase 2 — Frontend: servicio y tipos

6. En `src/api.ts`, agregar tipo `TasaInfo` y actualizar retorno de `getBudgetStatus()`.
7. En `src/config.ts`, agregar `DEFAULT_TASA = 36.50` como último fallback.
8. **Verificación:** `getBudgetStatus()` retorna objeto con campo `tasa`.

### Fase 3 — Frontend: UI del header

9. En `src/App.tsx`, extraer `tasa` del fetch y guardarlo en estado.
10. Mostrar en header: "Tasa: 36.50 Bs/$ (BCV, 01/09)" o "Tasa: Manual" si no hay dato.
11. Si `tasa.valor` es `null`, mostrar badge amarillo "Tasa no disponible".
12. **Verificación:** Header muestra tasa actualizada del BCV.

### Fase 4 — Frontend: formulario prellenado

13. En `src/ExpenseForm.tsx`, aceptar prop `tasaInicial?: number` como default del campo.
14. Si `null`, campo vacío con placeholder "Ingresa tasa manual".
15. **Verificación:** Campo tasa viene con valor del BCV. Editar manual funciona.

### Fase 5 — Fallback manual

16. En `src/App.tsx`, si `tasa.valor` es null, pasar `tasaInicial={undefined}`.
17. En `src/ExpenseForm.tsx`, validar que tasa no esté vacía antes de enviar.
18. **Verificación:** API caída → formulario permite ingreso manual con aviso.

---

## Acceptance criteria

- [ ] `doGet()` incluye campo `tasa` con `valor`, `fuente`, `fecha`, `manual`
- [ ] La tasa se almacena en Sheets y se reutiliza si es del mismo día
- [ ] Si la API falla, se usa la última tasa cacheada
- [ ] Si no hay cache, `tasa.valor` es `null` y `manual` es `true`
- [ ] El header muestra la tasa actual con fuente y fecha
- [ ] El campo tasa del formulario se prellena con la tasa del BCV
- [ ] El usuario puede editar la tasa manualmente
- [ ] Sin tasa disponible → formulario requiere tasa manual antes de enviar
- [ ] Sin errores en consola con API disponible
- [ ] Sin errores en consola con API caída (fallback funciona)

---

## Decisions

- **Yes:** GAS como proxy. Evita exponer API al navegador, permite caché en Sheets.
- **No:** Frontend fetch directo. CORS, sin caché persistente.
- **Yes:** ve.dolarapi.com como fuente. Gratuita, confiable, tasa BCV oficial de Venezuela.
- **No:** pydolarve.org. Dominio expirado, no disponible.
- **Yes:** Caché diario en Sheets. Simple, persistente.
- **No:** Caché en localStorage. Se pierde entre dispositivos.
- **Yes:** Una consulta/día. Tasa BCV es diaria.
- **No:** Consulta por transacción. Innecesario, lento.
- **Yes:** Fallback cascade: API → cache → manual.
- **No:** Solo fallback manual. Pierde conveniencia.
- **Yes:** Tasa en header como referencia.
- **No:** Tasa solo en formulario.

---

## Risks

| Risk | Mitigation |
|------|------------|
| ve.dolarapi.com caído | Cache en Sheets; si no hay cache → manual |
| GAS cuota de ejecución | Una consulta/día, costo mínimo |
| Tasa no disponible en feriados | Cache retiene última tasa; usuario puede editar |
| Rate limiting | Una consulta/día bajo cualquier límite |

---

## What is **not** in this spec

- Historial de tasas de cambio
- Gráfica de tendencia
- Conversión automática USD→VES
- Multi-moneda
- Notificaciones push de cambio de tasa
- Scraping directo del BCV
