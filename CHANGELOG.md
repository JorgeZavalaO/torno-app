# Changelog

Formato basado en Keep a Changelog y SemVer.

## [Unreleased]

### Added
- **Workflow paso a paso para montar herramientas en máquinas**:
  - Rediseño de interfaz `MachineTools` con arquitectura de wizard de 3 pasos.
  - Combobox (Command + Popover) para búsqueda y selección de productos con teclado.
  - Select dinámico de series/instancias filtrado por producto seleccionado y excluyendo ya montadas.
  - Botón de agregar individual para acumular herramientas en cola antes de montar.
  - Sección "Herramientas a Montar" con contador y botones de eliminar individual.
  - Indicadores numéricos "1" y "2" para guiar flujo de trabajo.
  - Montaje en batch de todas las herramientas seleccionadas en una sola operación.
- **Optimización de caché en módulo de clientes**:
  - Agregado `revalidate: 300` (5 minutos) a `getClientsCached()` para auto-expiración de caché.
  - Nueva server action `clearClientsCache()` para invalidación manual inmediata del caché.
  - Botón "Limpiar Caché" en header de vista de clientes con spinner animado y tooltip informativo.
  - Botón "Descargar CSV" para exportar lista actual de clientes como archivo (formato: `clientes_YYYY-MM-DD.csv`).
  - Funciones `handleClearCache()` y `handleDownloadData()` en `clientes.client.tsx`.
  - Solución al problema de persistencia de datos en UI después de reset de base de datos.
- **Trazabilidad Unitaria y Costeo Real de Herramientas**:
  - Nuevos modelos `ToolInstance` y `OTToolUsage` para rastrear herramientas individuales montadas en máquinas.
  - Campos `requiereTrazabilidad` y `vidaUtilEstimada` en `Producto` para marcar herramientas trazables.
  - Estados de herramienta: `NUEVA`, `EN_USO`, `AFILADO`, `DESGASTADA`, `ROTA`, `PERDIDA`.
  - **Desgaste automático durante producción**: Al registrar horas/piezas en OT, se imputa costo estimado a herramientas montadas en máquina.
  - **Recálculo retroactivo al fin de vida**: Cuando herramienta alcanza estado final, se calcula costo real y se ajusta retroactivamente en todas las OTs donde fue usada.
  - Server Actions: `createToolInstance`, `mountToolOnMachine`, `registerMachineProduction`, `updateToolStatus`, `finalizeToolLifeAndRecalculate`.
  - UI: Componente `MachineTools` en detalle de máquina con tabla de herramientas montadas, diálogos para montar/desmontar/reportar.
  - Prueba de flujo completo: `scripts/test-tool-lifecycle-flow.ts` valida ciclo completo (creación → montaje → desgaste → retroactivo).
- **Configuración Prisma optimizada para Prisma 6.13.0**:
  - Cambio de generator de `prisma-client` (nuevo, ESM) a `prisma-client-js` (clásico) para máxima compatibilidad.
  - Eliminación de errores de módulos "Can't resolve '.prisma/client/index-browser'" en Vercel.
  - Build reproducible y estable en local y CI/CD.
  - Generación de archivos correctos en `node_modules/.prisma/client` esperados por `@prisma/client`.
- **Mejoras en diálogos de importación y creación**:
  - Soporte para descarga de plantillas Excel (.xlsx) en importación de clientes e inventario.
  - Función `createSimpleExcel()` reutilizable para generar archivos Excel en formato SpreadsheetML XML sin dependencias externas.
  - Plantillas con datos de ejemplo y esquema correcto para cada módulo (clientes: RUC, email, contacto; productos: categoría, UOM, costo, stock mínimo).
  - Compatible con Excel, LibreOffice y Google Sheets.
- **Parámetros de costeo customizables por cotización**:
  - Nuevos campos en diálogo de nueva cotización: "Gastos Indirectos (GI)" y "Margen de Ganancia" editables por porcentaje.
  - Los valores customizados aplican solo a la cotización actual y no afectan los parámetros globales del sistema.
  - Indicadores visuales (badges "Personalizado" y alerta) cuando se usan parámetros customizados.
  - Estado de parámetros customizados se resetea al cerrar el diálogo.
- **Mejora UI en diálogo "Crear Nuevo Producto"**:
  - Rediseño con arquitectura de cards jerárquicas (SKU, Básico, Financiero, Códigos Equivalentes).
  - Encabezado con gradiente e icono de paquete.
  - Sección de resumen con indicadores emoji (💰 costo en verde, 📦 stock en ámbar).
  - Mejor espaciado y organización visual con separadores.
- Endpoint `/api/uploads/reclamos` para cargar archivos adjuntos con integración a Vercel Blob Storage.
- Validación de archivos en cliente (2MB máximo) y servidor (MIME types: JPEG, PNG, WebP, PDF).
- Mejoras en UX/UI del diálogo "Crear Nuevo Reclamo":
  - Área de arrastrar y soltar (drag-and-drop) para archivos.
  - Lista de archivos con iconos y tamaño en MB.
  - Botones para eliminar archivos individuales (X icon).
  - Mensajes de validación inline para archivos.
  - Character counters para título (200) y descripción (1000).
  - Spinner y botones deshabilitados durante envío.
  - Mejor organización visual con secciones claras.
- **Refactorización completa del módulo de reclamos**: Separación del componente monolítico `reclamos.client.tsx` (1100+ líneas) en componentes modulares reutilizables.
- **Componentes nuevos creados**:
  - `CreateReclamoDialog`: Diálogo de creación con validación, subida de archivos y selects con búsqueda.
  - `ApproveReclamoDialog`: Diálogo de aprobación con tipos de resolución.
  - `ReclamoDetailDialog`: Vista detallada con exportación a PDF.
  - `ReclamosFilters`: Filtros y búsqueda con selects mejorados.
  - `ReclamosList`: Lista de reclamos con acciones de aprobación/rechazo.
  - `RecentOTs`: Panel de órdenes de trabajo recientes.
- **Funcionalidad de búsqueda añadida**: Selects de cliente y OT ahora incluyen búsqueda con Command component (filtrado en tiempo real).

### Fixed
- Creación de reclamo fallaba por campo `archivos` requerido en el modelo Prisma; ahora se crea con arreglo vacío por defecto para evitar error 500.
- Errores de TypeScript en build:
  - Agregado `clearClientsCache` al tipo `ClientActions` en `src/components/clientes/types.ts`.
  - Eliminado prop `onClientCreated` no utilizado de `ClientTable` y `ClientRow`.
  - Suprimido warning de variable `__currency` no usada en desestructuración de `compras/actions.ts`.


## [0.9.1] - 2025-10-22
### Changed
- Documentación de pruebas unificada: `docs/TESTING.md` ahora incluye configuración de integración, matriz de requisitos, casos por módulo y datos de prueba.
- README.md actualizado con enlaces simplificados a documentación consolidada.

### Removed
- Archivos de documentación redundantes eliminados:
  - `docs/INTEGRATION-TESTS.md`
  - `docs/PRUEBAS_MODULOS.md`
  - `docs/MATRIZ-REQUISITOS-PRUEBAS.md`
  - `docs/test-data.md`
  - `docs/CORRECCION-SINCRONIZACION-MATERIALES.md`
  - `docs/SOLUCION-ERROR-SSR.md`

## [0.9.0] - 2025-10-22
### Added
- Pruebas unitarias para acciones de catálogos y búsqueda por equivalentes en inventario.
- Pruebas de integración (opt-in por `DATABASE_URL_TEST`):
  - Recepción de OC → promedio ponderado de costos en inventario.
  - Re-cálculo de costos de OT (materiales, overheads, labor, total).
- Documentos: `docs/INTEGRATION-TESTS.md`, `docs/PRUEBAS_MODULOS.md`, `docs/MATRIZ-REQUISITOS-PRUEBAS.md`.

### Changed
- `jest.setup.ts`: mocks de Next (`revalidatePath`, `revalidateTag`) y entorno.
- README: sección de pruebas y enlaces a docs.

### Removed
- Archivos de documentación redundantes/unificados (ver lista en PR correspondiente):
  - GUIA-RAPIDA-PARAMETROS.md, MEJORAS-PARAMETROS-UX-UI.md, REFACTORING-PARAMETROS*.md, catalogos-centralizados.md, IMPLEMENTACION-COMPLETADA.md, RESUMEN-EJECUTIVO-GERENCIA.md, SOLUCION-ERROR-SSR.md, implementacion-costos-diferenciados.md, VERIFICACION-CALCULOS-COTIZACION.md, test-data.md.

[Unreleased]: ./CHANGELOG.md
[0.9.1]: ./CHANGELOG.md
[0.9.0]: ./CHANGELOG.md