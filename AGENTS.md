# Agent Instructions — Pocket50

## Domain Context

PWA de finanzas personales para Venezuela.
- Gastos diarios en **Bolívares (VES)**
- Contabilidad, presupuesto y regla **50/30/20** en **Dólares (USD)**
- **Estado actual:** Template base. Sin lógica financiera implementada.

## Regla 50/30/20 — Mapeo de Categorías

| % | Tipo | Categorías |
|---|------|------------|
| 50% | **Necesidades** | Alimentación, Vivienda, Transporte, Salud, Educación, Servicios básicos |
| 30% | **Deseos** | Entretenimiento, Suscripciones, Compras personales, Salidas, Otros deseos |
| 20% | **Ahorro/Deuda** | Ahorro, Pago de deudas, Inversiones, Fondo de emergencia |

Cada categoría se asigna a un tipo (need/want/saving) al momento de creación.
El presupuesto se calcula sobre ingresos netos mensuales en USD.

## Conversión de Moneda

- **API:** BCV (Banco Central de Venezuela) — `https://pydolarve.org/api/v1/dollar` (verificar endpoint exacto)
- **Flujo:** Se consulta la tasa al registrar un gasto en VES → se almacena el equivalente USD
- **Tasa almacenada:** Cada transacción guarda la tasa de cambio usada en el momento
- **Fallback:** Si la API falla, permitir tasa manual

## Tipos de Transacción

| Tipo | Descripción |
|------|-------------|
| `income` | Ingreso mensual (base para presupuesto) |
| `expense` | Gasto registrado en VES, convertido a USD |
| `transfer` | Movimiento entre cuentas/categorías |
| `debt` | Pago o registro de deuda |

## Períodos y Reportes

- **Período:** Mensual (ciclo natural de presupuesto 50/30/20)
- **Resúmenes:** Diario, semanal, mensual
- **Métricas:** % gastado por tipo, diferencia presupuesto vs real, tendencia mensual

## Runtime & Package Manager

**Bun** — no Node. Todos los comandos usan `bun`.

## Commands

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Dev server | `bun dev` (`bun --hot src/index.ts`) |
| Production | `bun start` (`NODE_ENV=production bun src/index.ts`) |
| Build | `bun run build.ts` → `dist/` |

No hay scripts de lint, typecheck, test, o formatter. **Gap: considerar agregar antes de producción.**

## Architecture

- **Server entry:** `src/index.ts` — Bun `serve()` con rutas inline.
- **Client entry:** `src/index.html` → `src/frontend.tsx` → `src/App.tsx`
- **Styling:** Tailwind CSS 4 via `bun-plugin-tailwind`. Config en `bunfig.toml`.
- **API pattern:** Rutas en objeto `routes` de `serve()`, no Express/Fastify.

## Key Quirks

- `verbatimModuleSyntax: true` — usar `import type` para imports de solo tipos.
- `noUncheckedIndexedAccess: true` — index signatures retornan `T | undefined`.
- Path alias: `@/*` → `./src/*`
- HMR usa `import.meta.hot.data` (ver `src/frontend.tsx`)
- Build: `Bun.build()` con `target: "browser"` y `sourcemap: "linked"`
- Env vars del cliente: prefijo `BUN_PUBLIC_*` (config en `bunfig.toml`)

## Agent Protocol

Protocolo global de modos (en `~/.config/opencode/`):
1. **PLAN** → escribe `task_plan.md` con BDD (Given-When-Then)
2. **BUILD** → implementa según el plan
3. **QA** → audita `git diff` y ejecuta verificaciones

Máximo 2 iteraciones BUILD↔QA antes de intervención humana.
**PROHIBIDO** ejecutar `git push` o comandos que interactúen con el remoto.
