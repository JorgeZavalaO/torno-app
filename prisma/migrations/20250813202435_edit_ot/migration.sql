-- AlterTable
ALTER TABLE "public"."ParteProduccion" ADD COLUMN     "motivoScrap" TEXT,
ADD COLUMN     "piezaId" TEXT,
ADD COLUMN     "qtyBuenas" DECIMAL(12,3) DEFAULT 0,
ADD COLUMN     "qtyScrap" DECIMAL(12,3) DEFAULT 0;

-- CreateIndex
CREATE INDEX "Movimiento_refTabla_refId_fecha_idx" ON "public"."Movimiento"("refTabla", "refId", "fecha");

-- CreateIndex
CREATE INDEX "ParteProduccion_piezaId_idx" ON "public"."ParteProduccion"("piezaId");

-- CreateIndex
CREATE INDEX "SolicitudCompra_otId_idx" ON "public"."SolicitudCompra"("otId");

-- AddForeignKey
ALTER TABLE "public"."SolicitudCompra" ADD CONSTRAINT "SolicitudCompra_otId_fkey" FOREIGN KEY ("otId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParteProduccion" ADD CONSTRAINT "ParteProduccion_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "public"."OTPieza"("id") ON DELETE SET NULL ON UPDATE CASCADE;
