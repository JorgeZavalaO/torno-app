# Catálogos del Sistema (resumen)

Unifica la documentación de catálogos centralizados y su uso.

## Qué son
Tabla `ConfiguracionCatalogo` define listas administrables (valores, orden, color, icono, activo).

Tipos comunes (no exhaustivo):
- Inventario: UNIDAD_MEDIDA, CATEGORIA_PRODUCTO, TIPO_MOVIMIENTO
- Órdenes de Trabajo: ESTADO_OT, PRIORIDAD_OT, TIPO_ACABADO
- Máquinas: ESTADO_MAQUINA, EVENTO_MAQUINA, CATEGORIA_MAQUINA, TIPO_MANTENIMIENTO
- Compras: ESTADO_SC, ESTADO_OC
- Cotizaciones: ESTADO_COTIZACION, MONEDA, TIPO_PARAMETRO, TIPO_TRABAJO (jerárquico)

## Operaciones
- Crear/editar con orden, color, icono, activo
- Reordenar con drag & drop (si aplica en UI)
- Reset a valores por defecto

## Uso en código
- Helpers: `getCatalogosByTipo`, `getCatalogoOptions`, `getCatalogoNombre`
- UI: `Admin → Catálogos`

## Pruebas
- Ver `__tests__/app/admin/catalogos.actions.test.ts` para upsert, update, soft delete y reset de tipos jerárquicos.

## Referencias
- Servicios: `src/app/server/services/catalogos.ts`
- Acciones UI: `(protected)/admin/catalogos/*`