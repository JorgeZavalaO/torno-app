# Guía de pruebas: estrategia y práctica

Este documento describe cómo probar TornoApp de forma efectiva y cómo documentar casos de prueba para cubrir reglas de negocio.

## Niveles de prueba

- Unitarias (rápidas):
  - Ubicación: `__tests__/**/*.test.(ts|tsx)`.
  - Aíslan funciones y componentes. Mock de Prisma/Next donde aplique.
  - Ejemplos: utils de formato, RBAC/guards, queries con prisma mockeado, componentes UI puros, hooks.

- Integración (módulo-servicio + DB):
  - Ubicación: `__tests__/integration/**`.
  - Verifican flujos con Prisma y reglas de negocio sobre un DB de pruebas.
  - Recomendado: Postgres de test con `prisma migrate reset` y seed mínimo.
  - Ejecutar con `pnpm test:integration`.

- End-to-End (E2E):
  - Ubicación: `__tests__/e2e/**` (Playwright o Cypress).
  - Navegan la app real (build/dev) para validar escenarios completos.
  - Sugerencia: Playwright por integración con Next.

## Cómo correr

```powershell
pnpm test           # toda la suite (unit + componentes + hooks)
pnpm test:unit      # sin integration/e2e
pnpm test:integration
pnpm test:e2e
pnpm test:coverage  # cobertura
```

## Estructura y convenciones

- `__tests__/` contiene carpetas por dominio: `lib`, `app/lib`, `app/server/queries`, `server/actions`, `components/ui`, `hooks`.
- Naming: `*.test.ts` para Node y `*.test.tsx` para UI/hooks (añadir `@jest-environment jsdom`).
- Mocks globales en `jest.setup.ts` (Next cache/headers) y `moduleNameMapper` para `server-only`.
- Si usas iconos (lucide), mockéalos en el test: `jest.mock('lucide-react', () => ({ Icon: () => <svg/> }))`.

## Integración con BD (patrón recomendado)

1) Crea una base de datos de testing (Postgres) y define `DATABASE_URL_TEST` en `.env.test`.
2) En `jest.config.ts`, añade un `globalSetup`/`globalTeardown` opcional para:
   - Ejecutar `prisma migrate reset --force` (vía Node/child_process) antes de la suite.
   - Ejecutar `prisma db seed` si aplica.
3) En cada test de integración, usa `prisma` real y crea datos en `beforeEach`. Limpia por transacción o truncado.
4) Evita dependencias externas: si usas correo/servicios, mockéalos.

Ejemplo de setup (pseudo):
```ts
// __tests__/integration/setup.ts
import { execa } from 'execa';
export default async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  await execa('pnpm', ['prisma', 'migrate', 'reset', '--force'], { stdio: 'inherit' });
};
```

> Nota: Mantén unit tests 100% aislados del DB; usa integración sólo para reglas de negocio que combinan varias tablas.

## Documentar reglas de negocio

- Usa una Matriz Requisito → Caso de prueba (véase `docs/MATRIZ-REQUISITOS-PRUEBAS.md`).
- Escribe escenarios en Given-When-Then (Gherkin) para flujos clave (`docs/PLANTILLA-GHERKIN.md`).
- Casos manuales: usa plantilla `docs/PLANTILLA-CASO-DE-PRUEBA.md`.

### Ejemplo (Gherkin) — Promedio ponderado al recibir OC

```
Feature: Actualización de costo promedio en inventario
  As un responsable de compras
  I want actualizar el costo promedio al recibir una OC
  So that el inventario refleje el costo real

  Scenario: Recepción parcial actualiza costo promedio
    Given un producto P con costo actual 10 y stock 0
    And existe una OC de 10 unidades a costo 12
    When registro recepción de 4 unidades
    Then el costo promedio de P debe ser 12
    And el stock aumenta a 4
```

Vincula este escenario a un test de integración que use Prisma real y el flujo de `receiveOC`.

## Módulos y checklist de cobertura

- Autenticación y RBAC:
  - Sesión → perfil (id, email, displayName)
  - Permisos por rol (lectura/escritura)
  - Guards bloquean acceso sin permiso

- Catálogos / Parámetros:
  - CRUD y validación de tipos
  - Propagación de `currency` y conversión con `usdRate`

- Inventario / Compras:
  - SC: pendientes por ítem y totales
  - OC: recepción parcial/total, pendientes y kardex
  - Costeo: promedio ponderado por últimos N ingresos

- Órdenes de Trabajo (OT):
  - Re-cálculo idempotente de costos (materiales/labor/overheads)
  - Eventos (uso/paro/avería) impactan métricas

- Máquinas:
  - KPIs 30d: horas, pendientes, fallas/averías, costo, horas hasta próximo mant

- Cotizador:
  - Moneda base aplicada en totales y desglose

- UI/Componentes:
  - Props principales y estados (loading/disabled)
  - Accesibilidad básica (roles/aria)

## Métricas de calidad

- Límite de cobertura sugerido (gradual): statements/branches/functions > 80%.
- Tiempo de suite unit: < 10s local.
- Tests deterministas: congela tiempo donde aplique (ej: 30 días).

## CI/CD (sugerido)

- Workflow GitHub Actions:
  - `pnpm install` → `pnpm test` → (opcional) `pnpm test:integration` con DB de prueba.
  - Publicar cobertura en PR (Codecov u otra).

## Consejos

- TDD para utilidades y nuevos módulos.
- Usa factories/fixtures para datos comunes de integración.
- Minimiza mocks en integración; maximízalos en unitarias.
