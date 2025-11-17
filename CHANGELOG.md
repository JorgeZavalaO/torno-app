# Changelog

Formato basado en Keep a Changelog y SemVer.

## [Unreleased]

### Added
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