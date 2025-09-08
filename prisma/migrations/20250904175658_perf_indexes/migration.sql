-- CreateIndex
CREATE INDEX "MaquinaEvento_maquinaId_inicio_idx" ON "public"."MaquinaEvento"("maquinaId", "inicio");

-- CreateIndex
CREATE INDEX "MaquinaEvento_otId_idx" ON "public"."MaquinaEvento"("otId");

-- CreateIndex
CREATE INDEX "MaquinaMantenimiento_maquinaId_idx" ON "public"."MaquinaMantenimiento"("maquinaId");

-- CreateIndex
CREATE INDEX "MaquinaMantenimiento_estado_idx" ON "public"."MaquinaMantenimiento"("estado");

-- CreateIndex
CREATE INDEX "Movimiento_fecha_idx" ON "public"."Movimiento"("fecha");

-- CreateIndex
CREATE INDEX "Movimiento_tipo_fecha_idx" ON "public"."Movimiento"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "OCItem_scItemId_idx" ON "public"."OCItem"("scItemId");

-- CreateIndex
CREATE INDEX "OCItem_productoId_idx" ON "public"."OCItem"("productoId");

-- CreateIndex
CREATE INDEX "OrdenTrabajo_creadaEn_idx" ON "public"."OrdenTrabajo"("creadaEn");

-- CreateIndex
CREATE INDEX "ParteProduccion_fecha_idx" ON "public"."ParteProduccion"("fecha");

-- CreateIndex
CREATE INDEX "Producto_nombre_idx" ON "public"."Producto"("nombre");
