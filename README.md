<div align="center">

# TornoApp

Aplicación interna para gestión de taller de manufactura/torno: cotizaciones, órdenes de trabajo, inventario, compras, máquinas y administración (usuarios/roles/permisos).

</div>

## Resumen ejecutivo

TornoApp es una aplicación interna para gestionar un taller de manufactura: cotizaciones, órdenes de trabajo (OT), inventario, compras, máquinas y administración (usuarios/roles/permisos, parámetros y catálogos). Está optimizada para rendimiento (índices SQL, caché por tags) y ofrece controles de seguridad basados en permisos. La moneda base del sistema es configurable (PEN/USD) con conversión automática de parámetros monetarios.

## Novedades (sept. 2025)

- Catálogos del sistema: nueva entidad `ConfiguracionCatalogo` para reemplazar/enriquecer enums, con UI en Administración → Catálogos (reordenar, activar/inactivar, color, icono, reset a valores por defecto).
- Máquinas: métricas y KPIs ampliados (paradas por fallas, averías, costo de mantenimiento últimos 30 días, horas hasta próximo mantenimiento), registro de eventos, programación/edición de mantenimientos y registro rápido de horas.
- Compras/Inventario: costeo por Promedio Ponderado automatizado al recibir OC + botón de recálculo manual para casos excepcionales.
- Cotizador: conversión automática de parámetros tipo moneda al cambiar la moneda base; nuevas cotizaciones usan la moneda vigente. (Alertas y acciones masivas pendientes.)
- RBAC consolidado: permisos de catálogos (`settings.catalogos.read/write`) y scripts para asignación/verificación.

## Tabla de contenidos

- [Resumen ejecutivo](#resumen-ejecutivo)
- [Características](#características)
- [Requisitos](#requisitos)
- [Inicio rápido](#inicio-rápido)
- [Variables de entorno](#variables-de-entorno)
- [Arquitectura y estructura](#arquitectura-y-estructura)
- [Resumen por módulos](#módulos-y-funciones)
- [Guía rápida por rol](#guía-rápida-por-rol)
- [Catálogos del sistema](#catálogos-del-sistema)
- [Costeo: Promedio Ponderado](#costeo-promedio-ponderado)
- [Cotizador: sistema de moneda](#cotizador-sistema-de-moneda)
- [RBAC y permisos](#rbac-y-permisos)
- [Scripts de Prisma y orquestador](#scripts-de-prisma-y-orquestador)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Troubleshooting](#troubleshooting)

## Características

- Autenticación con credenciales (NextAuth v5) y sesiones JWT.
- RBAC (roles y permisos) centralizado con caché por usuario.
- Módulos principales:
  - Dashboard con KPIs y alertas.
  - Producción: Órdenes de Trabajo, Programación, Control de Producción, Máquinas.
  - Ventas: Cotizador y Clientes.
  - Compras e Inventario (productos, movimientos, equivalentes ERP, importación CSV).
  - Administración: Usuarios, Roles, Permisos, Parámetros de costeo y Catálogos del sistema.
- Prisma + PostgreSQL con migraciones y scripts de mantenimiento/índices.
- Sistema de caché granular con tags e invalidación selectiva.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- NextAuth 5 (Credentials)
- Prisma 6 + PostgreSQL (Neon u on-prem)
- Tailwind CSS v4 + Radix UI + componentes estilo shadcn
- Zod, date-fns, recharts, sonner, xlsx

## Requisitos

- Node.js 20 LTS (recomendado) — mínimo 18.18+
- pnpm (recomendado) o npm
- PostgreSQL 14+ (local o servicio gestionado)

## Inicio rápido

1) Instalar dependencias

```bash
pnpm install
# o
npm install
```

2) Variables de entorno

- Copia `.env.example` a `.env` y completa los valores.
- Genera `AUTH_SECRET` (64 bytes base64):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

3) Base de datos (Prisma)

```bash
pnpm db:generate            # Genera el cliente Prisma
pnpm db:migrate             # Aplica migraciones (desarrollo)
pnpm exec prisma db seed    # (opcional) datos semilla: admin y permisos básicos
```

Importante: si usas el seed, edita `prisma/seed.ts` para definir email/contraseña del admin (o usa scripts de permisos/roles de la sección RBAC).

4) Ejecutar en desarrollo

```bash
pnpm dev
```

Abre `http://localhost:3000/login` e ingresa con el admin configurado.

## Scripts útiles

- **Aplicación**
  - `pnpm dev` — desarrollo (Turbopack)
  - `pnpm build` — build de producción
  - `pnpm start` — servidor en producción
  - `pnpm lint` — ESLint
  - `pnpm analyze` — bundle analyzer de Next
  
- **Base de datos (Prisma)**
  - `pnpm db:generate` — generar cliente Prisma
  - `pnpm db:migrate` — migraciones en dev
  - `pnpm db:seed` — seed principal del sistema
  - `pnpm db:studio` — Prisma Studio
  - `pnpm db:optimize` — aplica índices de rendimiento
  - `pnpm db:maintenance` — tareas de mantenimiento (limpieza/optimizaciones)
  
- **Seguridad/RBAC**
  - `pnpm grant:permissions` — crea/actualiza todos los permisos y los asigna a `admin`
  - `pnpm grant:admin <email>` — asigna el rol `admin` a un usuario
  - `pnpm verify:permissions` — verifica configuración de permisos/roles
  
- **Testing/Desarrollo**
  - `pnpm test:create-data` — crear datos de prueba para desarrollo
  - `pnpm test:cleanup` — limpiar datos de prueba
  - `pnpm test:machines` — probar métricas de máquinas
  
- **Script consolidado**
  - `node prisma/scripts/admin.js help` — ver todos los comandos disponibles
  - `node prisma/scripts/admin.js seed` — ejecutar seed principal
  - `node prisma/scripts/admin.js test:create-data` — crear datos de test
  
- **Costeo (opcional)**
  - `npx tsx prisma/scripts/maintenance/migrate-to-average-costs.ts` — migra costos existentes a promedio ponderado

Más detalles sobre scripts y estructura, en la sección "Scripts de Prisma y orquestador" más abajo.

Para detalles específicos, ver secciones: [RBAC y permisos](#rbac-y-permisos) y [Costeo: Promedio Ponderado](#costeo-promedio-ponderado).

## Variables de entorno

Revisa `.env.example` para valores y ejemplos.

- `DATABASE_URL` — cadena de conexión PostgreSQL
- `DATABASE_URL_UNPOOLED` — (opcional) conexión directa sin pool
- `NEXTAUTH_URL` — URL base (ej. `http://localhost:3000`)
- `AUTH_SECRET` — secreto NextAuth (64 bytes base64)
- `BUILD_STANDALONE` — (opcional) `true` para output `standalone`

## Arquitectura y estructura

```
src/
  app/
    (auth)/login             # Login (NextAuth credentials)
    (protected)/             # Vistas autenticadas por módulo
      dashboard/
      cotizador/
      clientes/
      inventario/
      compras/
      maquinas/
      ot/
      programacion/
      control/
      admin/                 # Usuarios, Roles, Permisos, Parámetros, Catálogos
    api/                     # Route Handlers (REST-ish)
    lib/                     # prisma, auth helpers, rbac, cache-tags, currency
    server/queries/          # Acceso a datos + caché por tags
  components/                # UI y componentes por módulo
  hooks/
prisma/
  schema.prisma              # Modelo de datos
  migrations/                # Migraciones
  seed.ts                    # Datos semilla (admin/permisos)
  *.ts                       # Scripts (índices, permisos, migraciones auxiliares)
```

- Autenticación: `src/server/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`.
- Seguridad/caché: `src/middleware.ts` agrega headers, CORS y cache-control.
- RBAC: `src/app/lib/guards.ts`, `src/app/lib/rbac.ts` y sección [RBAC y permisos](#rbac-y-permisos).
- Caché: `unstable_cache` + tags (`src/app/lib/cache-tags.ts`).
- Moneda/currency: `src/app/server/queries/costing-params.ts` y helpers en `src/app/lib/format.ts` / conversiones.

## Módulos y funciones

- Inventario
  - Productos con costos, UOM, stock mínimo, kardex por movimientos.
  - Movimientos: ingresos/salidas, validación de stock, costo de referencia.
  - Códigos equivalentes con ERP (`ProductoCodigoEquivalente`).
  - Importación CSV (cabeceras: `Nombre,Categoría,UOM,Costo,StockMinimo`).
- Compras
  - Solicitudes (SC) y Órdenes (OC), proveedores, estados y recepción parcial/total.
  - Recálculo de costos promedio ponderado automático en recepción y botón manual.
- Producción / Órdenes de Trabajo
  - Piezas y materiales por OT, prioridad, acabado, fecha límite, partes de producción.
  - Integración con compras para emitir materiales y crear SC por faltantes.
- Máquinas
  - Listado con filtros y KPIs (horas últimos 30d, pendientes, fallas/averías, costo 30d, horas hasta próximo mant.).
  - Registro de eventos (uso, paro, avería), registro rápido de horas, programación/edición/cierre de mantenimiento.
- Cotizador y Clientes
  - Parámetros de costeo, desglose y conversión automática de moneda.
- Administración
  - Usuarios/roles/permisos y parámetros.
  - Catálogos del sistema (ver siguiente sección).

## Guía rápida por rol

- Administrador
  - Usuarios y roles/permisos: Admin → Seguridad.
  - Parámetros de costeo: Admin → Parámetros. Cambiar `currency` y `usdRate` si corresponde.
  - Catálogos del sistema: Admin → Catálogos (crear/editar, reordenar, activar/desactivar, reset).
  - Scripts: ver sección “Scripts de Prisma y orquestador” al final del README.

- Compras
  - Crear SC (Solicitud de Compra) y aprobar flujo: Compras → SC.
  - Generar OC desde SC aprobada: Compras → OC.
  - Recepción parcial/total: Compras → OC → Recibir. Actualiza costos promedio automáticamente.
  - Recalcular costos manualmente (excepcional): botón “Recalcular costos”.

- Inventario
  - Productos, stock y costos: Inventario → Productos.
  - Movimientos (ingresos/salidas): Inventario → Movimientos.
  - Importación CSV y equivalentes ERP.

- Producción (Órdenes de Trabajo)
  - Crear/editar OT con piezas, materiales, prioridad y fecha límite: Producción → OT.
  - Emitir materiales e integrar con Compras para faltantes.

- Máquinas
  - KPIs, eventos (uso/paro/avería), registro de horas.
  - Programación y cierre de mantenimientos.

- Ventas / Cotizador
  - Crear/editar cotizaciones; nuevas toman la moneda vigente del sistema.
  - La conversión de parámetros monetarios ocurre al cambiar la moneda base (PEN/USD); las aprobadas no se modifican.

## Catálogos del sistema

Nueva tabla `ConfiguracionCatalogo` para definir valores de:

- Productos: UNIDAD_MEDIDA, CATEGORIA_PRODUCTO, TIPO_MOVIMIENTO
- Órdenes de Trabajo: ESTADO_OT, PRIORIDAD_OT, TIPO_ACABADO
- Máquinas: ESTADO_MAQUINA, EVENTO_MAQUINA, CATEGORIA_MAQUINA, TIPO_MANTENIMIENTO, ESTADO_MANTENIMIENTO
- Compras: ESTADO_SC, ESTADO_OC
- Cotizaciones: ESTADO_COTIZACION, MONEDA, TIPO_PARAMETRO

UI en `Admin → Catálogos` para crear/editar, reordenar, activar/desactivar y restablecer valores. Helpers disponibles:

- `getCatalogosByTipo`, `getCatalogoOptions`, `getCatalogoNombre`.

Más en `src/app/server/services/catalogos.ts` y páginas bajo `src/app/(protected)/admin/catalogos/`.

## Costeo: Promedio Ponderado

Resumen
- Automático al recibir Órdenes de Compra (no requiere acción manual normal).
- Botón “Recalcular costos” en Compras para casos excepcionales.
- Script opcional para aplicar a datos históricos.

Implementación
1) Cálculo del promedio ponderado
  - Archivo: `src/app/(protected)/compras/actions.ts`
  - Función: `calculateWeightedAverageCost(tx, productoId, qty, cost, maxMovements = 10)`
  - Lógica: suma ponderada de los últimos N (10) movimientos `INGRESO_COMPRA` (cantidad × costo) / cantidad total; evita división por cero; redondeo a 2 decimales; considera solo ingresos positivos.
2) Recepción de OC (total o parcial)
  - Función: `receiveOC(...)` registra movimientos y actualiza `Producto.costo` con el promedio ponderado.
  - Estados de OC: `OPEN` → `PARTIAL` → `RECEIVED`.
3) Recalculo manual por UI
  - Componente: `src/components/compras/recalculate-costs-button.tsx`
  - Acción: `recalculateAllProductCosts()` en `compras/actions.ts`
  - Recorre productos y actualiza costo con los últimos 10 ingresos por compra.
4) Script de consola (histórico)
  - `npx tsx prisma/scripts/maintenance/migrate-to-average-costs.ts`

Parámetros y casos especiales
- Movimientos considerados: últimos 10 de tipo `INGRESO_COMPRA`.
- Sin historial: usa el nuevo costo como costo base.
- División por cero: usa el nuevo costo como fallback.
- Productos nuevos: el primer precio de compra se vuelve costo base.

Validación y monitoreo
- Logs en servidor durante `receiveOC` y recálculo.
- SQL de verificación (ejemplo): calcula promedio ponderado en DB para comparar con `Producto.costo`.

## Cotizador: sistema de moneda

Mejoras implementadas
1) Moneda base y tipo de cambio
  - Parámetros: `currency` (TEXT) y `usdRate` (NUMBER) en `CostingParam`.
  - Ubicación: `src/app/server/queries/costing-params.ts` (lectura/cache) y `src/app/(protected)/admin/parametros/actions.ts` (actualización/validación/conversión).
  - Al cambiar `currency` PEN ↔ USD, convierte automáticamente los parámetros tipo CURRENCY con `usdRate`:
    - A USD: PEN / usdRate
    - A PEN: USD × usdRate
2) Cotizaciones
  - Nuevas cotizaciones usan la moneda vigente del sistema.
  - Ediciones recalculan con parámetros vigentes; cotizaciones aprobadas no se modifican.
  - UI formatea valores con Intl.NumberFormat según moneda.

Ideas a futuro (no implementado aún)
- Conversión masiva de cotizaciones existentes al cambiar `currency`.
- Alertas/acciones de “mismatch” de moneda en listas.
- Utilidades de conversión dedicadas en `src/app/lib`.

## RBAC y permisos

Permisos del sistema (alineados a `src/app/lib/guards.ts`)
- Roles: `roles.read`, `roles.write`
- Permisos: `permissions.read`, `permissions.write`
- Usuarios: `users.assignRoles`
- Clientes: `clients.read`, `clients.write`
- Costeo/Parámetros: `settings.costing.read`, `settings.costing.write`
- Catálogos del sistema: `settings.catalogos.read`, `settings.catalogos.write`
- Cotizaciones: `quotes.read`, `quotes.write`
- Inventario: `inventory.read`, `inventory.write`
- Compras: `purchases.read`, `purchases.write`
- Órdenes de Trabajo: `workorders.read`, `workorders.write`
- Máquinas: `machines.read`, `machines.write`
- Producción: `production.read`, `production.write`

Scripts útiles
- `pnpm grant:permissions` — crea/actualiza todos los permisos y los asigna a `admin`.
- `pnpm verify:permissions` — verifica la configuración actual.
- `pnpm grant:admin <email>` — asigna el rol `admin` a un usuario.

## Scripts de Prisma y orquestador

Esta sección centraliza el uso de scripts (permisos, mantenimiento y pruebas) organizados bajo `prisma/scripts/` y los atajos definidos en `package.json`.

Estructura:

```
prisma/
  schema.prisma              # Esquema principal de la base de datos
  seed.ts                    # Seed principal del sistema
  scripts/                   # Scripts organizados por categorías
    permissions/            # Scripts de permisos y roles
    maintenance/            # Scripts de mantenimiento y migraciones
    tests/                  # Scripts de prueba y datos de test
  scripts/admin.js          # Orquestador de comandos (Node)
```

Seed principal

- Propósito: crear la configuración inicial (usuario admin, permisos, roles).
- Uso:

```bash
pnpm db:seed
# o
npx prisma db seed
```

Nota: ajusta en `prisma/seed.ts` las constantes de admin (email/contraseña) antes de ejecutar, o usa los scripts de permisos/roles.

Permisos y RBAC (atajos en package.json)

- `pnpm grant:permissions` — crea/actualiza todos los permisos y los asigna a `admin`.
- `pnpm verify:permissions` — verifica la configuración actual.
- `pnpm grant:admin <email>` — asigna el rol `admin` a un usuario.

Mantenimiento (índices/costeo)

- `pnpm db:optimize` — aplica índices de rendimiento.
- `npx tsx prisma/scripts/maintenance/migrate-to-average-costs.ts` — migra a costeo promedio ponderado.

Pruebas y datos de test

- `pnpm test:create-data` — crear datos de prueba para desarrollo.
- `pnpm test:cleanup` — limpiar datos de prueba.
- `pnpm test:machines` — ejecutar pruebas de KPIs/métricas de máquinas.

Orquestador de scripts (`admin.js`)

Además de los atajos, puedes usar el orquestador genérico:

```bash
node prisma/scripts/admin.js help           # Lista todos los comandos disponibles
node prisma/scripts/admin.js seed           # Ejecuta el seed principal
node prisma/scripts/admin.js permissions:all
```

Notas importantes

1) Realiza backup antes de ejecutar scripts de mantenimiento en entornos reales.
2) Los scripts de prueba crean/eliminan datos temporales.
3) Verifica credenciales/variables antes del seed.
4) La mayoría de scripts son idempotentes cuando aplica.

## Pruebas

- Ejemplo inicial en `__tests__/machines/queries.test.ts` (Jest).
- Si no hay script `test`, puedes ejecutar con `npx jest` previa configuración (ts-jest o transpilar). Pendiente completar configuración según necesidades del proyecto.

## Despliegue

- Configura `DATABASE_URL`, `NEXTAUTH_URL`, `AUTH_SECRET` en el entorno.
- Build y arranque:

```bash
pnpm build
pnpm start
```

- Compatible con Vercel; define variables de entorno y (opcional) `BUILD_STANDALONE=true`.

## Troubleshooting

- Prisma no genera cliente: `pnpm db:generate` y verifica `DATABASE_URL`.
- Errores de autenticación: revisa `AUTH_SECRET` y `NEXTAUTH_URL`.
- Consultas lentas: `pnpm db:optimize` y revisar índices/plan.

---

Hecho con Next.js + Prisma. Sugerencias y mejoras son bienvenidas.

## Plan de optimización (implementado)

Mejoras de rendimiento aplicadas
1) Base de datos
  - Pool de conexiones y timeouts en Prisma.
  - 20+ índices adicionales (incluyendo compuestos) para consultas frecuentes y reportes.
2) Next.js
  - Reducción de bundle, análisis de build, compresión y limpieza de logs.
  - Imágenes optimizadas (WebP/AVIF) y headers de caché.
3) Caché
  - Caché granular por módulo con invalidación selectiva por operación y tags.
4) Consultas y acceso a datos
  - Eliminación de N+1, paralelización con `Promise.all`, SQL raw en casos complejos.
5) Operaciones masivas
  - Batch operations, upserts optimizados, transacciones agrupadas.
6) Middleware y headers
  - Caché por tipo de ruta, seguridad básica y CORS, compatible con CDNs.
7) Mantenimiento
  - Limpieza periódica, aplicación de índices (script), estadísticas de DB.

Comandos
```bash
pnpm db:optimize     # aplicar índices
pnpm db:generate     # regenerar cliente Prisma
pnpm db:maintenance  # mantenimiento opcional
pnpm dev             # verificar en desarrollo
```

Monitoreo recomendado
- Tiempo de respuesta de APIs críticas
- Uso de memoria
- Tiempo de consultas lentas
- Hit rate de caché
- Concurrencia de transacciones

Mantenimiento continuo
- Semanal: `pnpm db:maintenance`, revisar consultas lentas y caché
- Mensual: crecimiento de datos, efectividad de índices
- Trimestral: nuevos índices, estrategias de caché, archivado histórico

Próximos pasos (opcionales)
- Redis para caché distribuido
- Connection pooling dedicado
- Read replicas
- Compresión HTTP y CDN para assets
