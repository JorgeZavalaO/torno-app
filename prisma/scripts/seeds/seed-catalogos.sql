-- Script SQL para poblar la tabla configuracionCatalogo
-- con los valores esperados por los componentes del frontend

-- UNIDAD_MEDIDA - Basado en el archivo uoms.ts eliminado
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo") VALUES
  ('UNIDAD_MEDIDA', 'pz', 'Pieza', 1, true),
  ('UNIDAD_MEDIDA', 'und', 'Unidad', 2, true),
  ('UNIDAD_MEDIDA', 'par', 'Par', 3, true),
  ('UNIDAD_MEDIDA', 'caja', 'Caja', 4, true),
  -- Longitud
  ('UNIDAD_MEDIDA', 'mm', 'Milímetro', 10, true),
  ('UNIDAD_MEDIDA', 'cm', 'Centímetro', 11, true),
  ('UNIDAD_MEDIDA', 'm', 'Metro', 12, true),
  ('UNIDAD_MEDIDA', 'pulg', 'Pulgada', 13, true),
  ('UNIDAD_MEDIDA', 'ft', 'Pie', 14, true),
  -- Peso
  ('UNIDAD_MEDIDA', 'g', 'Gramo', 20, true),
  ('UNIDAD_MEDIDA', 'kg', 'Kilogramo', 21, true),
  ('UNIDAD_MEDIDA', 'ton', 'Tonelada', 22, true),
  ('UNIDAD_MEDIDA', 'lb', 'Libra', 23, true),
  -- Volumen
  ('UNIDAD_MEDIDA', 'ml', 'Mililitro', 30, true),
  ('UNIDAD_MEDIDA', 'l', 'Litro', 31, true),
  ('UNIDAD_MEDIDA', 'gal', 'Galón', 32, true),
  -- Área
  ('UNIDAD_MEDIDA', 'm2', 'Metro cuadrado', 40, true),
  ('UNIDAD_MEDIDA', 'cm2', 'Centímetro cuadrado', 41, true),
  -- Paquetes
  ('UNIDAD_MEDIDA', 'pack', 'Paquete', 50, true),
  ('UNIDAD_MEDIDA', 'set', 'Set', 51, true),
  ('UNIDAD_MEDIDA', 'lote', 'Lote', 52, true),
  -- Tiempo
  ('UNIDAD_MEDIDA', 'hora', 'Hora', 60, true),
  ('UNIDAD_MEDIDA', 'día', 'Día', 61, true)
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "activo" = true;

-- CATEGORIA_PRODUCTO - Basado en product-categories.ts
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color") VALUES
  ('CATEGORIA_PRODUCTO', 'MATERIA_PRIMA', 'Materia Prima', 1, true, '#8B5CF6'),
  ('CATEGORIA_PRODUCTO', 'HERRAMIENTA_CORTE', 'Herramienta de Corte', 2, true, '#EF4444'),
  ('CATEGORIA_PRODUCTO', 'CONSUMIBLE', 'Consumible', 3, true, '#F59E0B'),
  ('CATEGORIA_PRODUCTO', 'REPUESTO', 'Repuesto', 4, true, '#10B981'),
  ('CATEGORIA_PRODUCTO', 'FABRICACION', 'Fabricación', 5, true, '#3B82F6')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "activo" = true;

-- TIPO_MOVIMIENTO - Basado en new-movement-dialog.tsx
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "descripcion", "orden", "activo", "color", "icono") VALUES
  ('TIPO_MOVIMIENTO', 'INGRESO_COMPRA', 'Ingreso por compra', 'Productos recibidos de proveedores', 1, true, '#10B981', 'TrendingUp'),
  ('TIPO_MOVIMIENTO', 'INGRESO_AJUSTE', 'Ingreso por ajuste', 'Corrección de inventario (aumentar stock)', 2, true, '#3B82F6', 'Settings'),
  ('TIPO_MOVIMIENTO', 'SALIDA_AJUSTE', 'Salida por ajuste', 'Corrección de inventario (reducir stock)', 3, true, '#F59E0B', 'Settings'),
  ('TIPO_MOVIMIENTO', 'SALIDA_OT', 'Salida a OT', 'Materiales asignados a orden de trabajo', 4, true, '#EF4444', 'TrendingDown')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "icono" = EXCLUDED."icono",
  "activo" = true;

-- PRIORIDAD_OT - Basado en priority-select.tsx
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color", "icono") VALUES
  ('PRIORIDAD_OT', 'LOW', 'Baja', 1, true, '#64748B', 'Minus'),
  ('PRIORIDAD_OT', 'MEDIUM', 'Media', 2, true, '#3B82F6', 'ArrowUp'),
  ('PRIORIDAD_OT', 'HIGH', 'Alta', 3, true, '#F59E0B', 'AlertTriangle'),
  ('PRIORIDAD_OT', 'URGENT', 'Urgente', 4, true, '#EF4444', 'Zap')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "icono" = EXCLUDED."icono",
  "activo" = true;

-- TIPO_ACABADO - Basado en new-ot-dialog.tsx y edit-header-dialog.tsx
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color", "icono") VALUES
  ('TIPO_ACABADO', 'NONE', 'Ninguno', 1, true, '#6B7280', null),
  ('TIPO_ACABADO', 'ZINCADO', 'Zincado', 2, true, '#71717A', 'Sparkles'),
  ('TIPO_ACABADO', 'TROPICALIZADO', 'Tropicalizado', 3, true, '#10B981', 'Brush'),
  ('TIPO_ACABADO', 'PINTADO', 'Pintado', 4, true, '#3B82F6', 'Palette'),
  ('TIPO_ACABADO', 'CROMADO', 'Cromado', 5, true, '#94A3B8', 'Sparkles'),
  ('TIPO_ACABADO', 'NATURAL', 'Natural', 6, true, '#F59E0B', 'Wrench')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "icono" = EXCLUDED."icono",
  "activo" = true;

-- ESTADO_OT - Estados básicos de órdenes de trabajo
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color") VALUES
  ('ESTADO_OT', 'DRAFT', 'Borrador', 1, true, '#6B7280'),
  ('ESTADO_OT', 'PLANNED', 'Planificada', 2, true, '#3B82F6'),
  ('ESTADO_OT', 'IN_PROGRESS', 'En Progreso', 3, true, '#F59E0B'),
  ('ESTADO_OT', 'COMPLETED', 'Completada', 4, true, '#10B981'),
  ('ESTADO_OT', 'CANCELLED', 'Cancelada', 5, true, '#EF4444')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "activo" = true;

-- ESTADO_MAQUINA - Estados de máquinas
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color") VALUES
  ('ESTADO_MAQUINA', 'ACTIVA', 'Activa', 1, true, '#10B981'),
  ('ESTADO_MAQUINA', 'MANTENIMIENTO', 'Mantenimiento', 2, true, '#F59E0B'),
  ('ESTADO_MAQUINA', 'BAJA', 'Fuera de Servicio', 3, true, '#EF4444')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "activo" = true;

-- EVENTO_MAQUINA - Tipos de eventos de máquinas
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color") VALUES
  ('EVENTO_MAQUINA', 'USO', 'En Uso', 1, true, '#10B981'),
  ('EVENTO_MAQUINA', 'PARO', 'Parada', 2, true, '#F59E0B'),
  ('EVENTO_MAQUINA', 'MANTENIMIENTO', 'Mantenimiento', 3, true, '#3B82F6'),
  ('EVENTO_MAQUINA', 'AVERIA', 'Avería', 4, true, '#EF4444'),
  ('EVENTO_MAQUINA', 'DISPONIBLE', 'Disponible', 5, true, '#6B7280')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "activo" = true;

-- ESTADO_SC - Estados de solicitudes de compra
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color") VALUES
  ('ESTADO_SC', 'DRAFT', 'Borrador', 1, true, '#6B7280'),
  ('ESTADO_SC', 'PENDING', 'Pendiente', 2, true, '#F59E0B'),
  ('ESTADO_SC', 'APPROVED', 'Aprobada', 3, true, '#10B981'),
  ('ESTADO_SC', 'REJECTED', 'Rechazada', 4, true, '#EF4444'),
  ('ESTADO_SC', 'CANCELLED', 'Cancelada', 5, true, '#6B7280')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "activo" = true;

-- ESTADO_OC - Estados de órdenes de compra
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color") VALUES
  ('ESTADO_OC', 'DRAFT', 'Borrador', 1, true, '#6B7280'),
  ('ESTADO_OC', 'SENT', 'Enviada', 2, true, '#3B82F6'),
  ('ESTADO_OC', 'CONFIRMED', 'Confirmada', 3, true, '#10B981'),
  ('ESTADO_OC', 'PARTIAL', 'Parcial', 4, true, '#F59E0B'),
  ('ESTADO_OC', 'RECEIVED', 'Recibida', 5, true, '#10B981'),
  ('ESTADO_OC', 'CANCELLED', 'Cancelada', 6, true, '#EF4444')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "activo" = true;

-- ESTADO_COTIZACION - Estados de cotizaciones
INSERT INTO "configuracionCatalogo" ("tipo", "codigo", "nombre", "orden", "activo", "color") VALUES
  ('ESTADO_COTIZACION', 'DRAFT', 'Borrador', 1, true, '#6B7280'),
  ('ESTADO_COTIZACION', 'SENT', 'Enviada', 2, true, '#3B82F6'),
  ('ESTADO_COTIZACION', 'APPROVED', 'Aprobada', 3, true, '#10B981'),
  ('ESTADO_COTIZACION', 'REJECTED', 'Rechazada', 4, true, '#EF4444'),
  ('ESTADO_COTIZACION', 'EXPIRED', 'Expirada', 5, true, '#6B7280')
ON CONFLICT ("tipo", "codigo") DO UPDATE SET 
  "nombre" = EXCLUDED."nombre",
  "orden" = EXCLUDED."orden",
  "color" = EXCLUDED."color",
  "activo" = true;

-- Verificar los datos insertados
SELECT 
  tipo, 
  COUNT(*) as total_items,
  COUNT(CASE WHEN activo = true THEN 1 END) as activos
FROM "configuracionCatalogo" 
WHERE tipo IN (
  'UNIDAD_MEDIDA', 'CATEGORIA_PRODUCTO', 'TIPO_MOVIMIENTO', 
  'PRIORIDAD_OT', 'TIPO_ACABADO', 'ESTADO_OT'
)
GROUP BY tipo
ORDER BY tipo;

-- Mostrar algunos ejemplos
SELECT tipo, codigo, nombre, color, icono 
FROM "configuracionCatalogo" 
WHERE tipo IN ('PRIORIDAD_OT', 'TIPO_ACABADO') 
ORDER BY tipo, orden;