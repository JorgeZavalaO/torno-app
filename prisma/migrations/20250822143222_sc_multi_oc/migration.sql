-- DropIndex
DROP INDEX "public"."OrdenCompra_scId_idx";

-- DropIndex
DROP INDEX "public"."OrdenCompra_scId_key";

-- CreateIndex
CREATE INDEX "OrdenCompra_scId_fecha_idx" ON "public"."OrdenCompra"("scId", "fecha");
