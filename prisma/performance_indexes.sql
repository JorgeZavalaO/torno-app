-- Índices adicionales para mejores consultas

-- Índices compuestos para reportes de producción
CREATE INDEX IF NOT EXISTS "ParteProduccion_userId_fecha_idx" ON "public"."ParteProduccion"("userId", "fecha" DESC);
CREATE INDEX IF NOT EXISTS "ParteProduccion_otId_userId_fecha_idx" ON "public"."ParteProduccion"("otId", "userId", "fecha" DESC);

-- Índices para inventario crítico
CREATE INDEX IF NOT EXISTS "Producto_stockMinimo_idx" ON "public"."Producto"("stockMinimo") WHERE "stockMinimo" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Movimiento_productoId_cantidad_idx" ON "public"."Movimiento"("productoId") WHERE "cantidad" != 0;

-- Índices para cotizaciones y OTs por cliente
CREATE INDEX IF NOT EXISTS "Cotizacion_clienteId_status_createdAt_idx" ON "public"."Cotizacion"("clienteId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "OrdenTrabajo_clienteId_estado_idx" ON "public"."OrdenTrabajo"("clienteId", "estado");

-- Índices para compras por fecha y estado
CREATE INDEX IF NOT EXISTS "SolicitudCompra_estado_createdAt_idx" ON "public"."SolicitudCompra"("estado", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "OrdenCompra_proveedorId_estado_fecha_idx" ON "public"."OrdenCompra"("proveedorId", "estado", "fecha" DESC);

-- Índices para optimizar joins frecuentes
CREATE INDEX IF NOT EXISTS "OTPieza_otId_productoId_idx" ON "public"."OTPieza"("otId", "productoId") WHERE "productoId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "OTMaterial_productoId_otId_idx" ON "public"."OTMaterial"("productoId", "otId");

-- Índice para búsquedas de texto en productos
CREATE INDEX IF NOT EXISTS "Producto_nombre_trgm_idx" ON "public"."Producto" USING gin("nombre" gin_trgm_ops);

-- Índices para rendimiento de usuarios
CREATE INDEX IF NOT EXISTS "UserProfile_email_idx" ON "public"."UserProfile"("email") WHERE "email" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "UserRole_userId_idx" ON "public"."UserRole"("userId");

-- Índices para prioridades y fechas límite
CREATE INDEX IF NOT EXISTS "OrdenTrabajo_prioridad_fechaLimite_idx" ON "public"."OrdenTrabajo"("prioridad", "fechaLimite") WHERE "fechaLimite" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "OrdenTrabajo_fechaLimite_estado_idx" ON "public"."OrdenTrabajo"("fechaLimite", "estado") WHERE "fechaLimite" IS NOT NULL;

-- Índices para eventos de máquina por tipo y fecha
CREATE INDEX IF NOT EXISTS "MaquinaEvento_tipo_inicio_idx" ON "public"."MaquinaEvento"("tipo", "inicio" DESC);
CREATE INDEX IF NOT EXISTS "MaquinaEvento_fin_idx" ON "public"."MaquinaEvento"("fin") WHERE "fin" IS NOT NULL;
