# Changelog

Formato basado en Keep a Changelog y SemVer.

## [Unreleased]

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