# Google Apps Script — Pocket50 Backend

## Setup (una vez)

1. Crear un **Google Sheet** nuevo
2. Renombrar la hoja por defecto a `Gastos`
3. Crear hoja `Config` con columnas: Clave | Valor
4. Crear hoja `MesActual` con columnas: Categoría | Total USD | Límite USD | %Usado
5. Ir a **Extensions > Apps Script**
6. Borrar el código por defecto y pegar el contenido de `code.gs`
7. Ejecutar la función `setupSheets()` una vez (para crear headers y datos iniciales)
8. Ir a **Deploy > New deployment > Web app**
   - Execute as: **Me** (propietario)
   - Who has access: **Anyone** (cualquiera)
9. Copiar el URL del despliegue

## Endpoints

### POST `/exec` — Registrar gasto

```json
{
  "montoVES": 45000,
  "tasa": 36.50,
  "categoria": "need",
  "descripcion": "Mercado Central",
  "subcategoria": "Alimentación",
  "fecha": "2026-09-01"
}
```

### GET `/exec` — Obtener estado del mes

Retorna `summary` (barras de progreso) y `alerts` (sobregastos).

### GET `/exec?action=config` — Obtener configuración

Retorna `ingresoMensualUSD` y `mes`.

### POST `/exec` — Guardar configuración

```json
{
  "ingresoMensualUSD": 800
}
```

## Notas

- El endpoint cambia en cada despliegue. Actualizar `GAS_ENDPOINT` en `src/config.ts` después de desplegar.
- El CORS ya está habilitado en las funciones por ContentService.
