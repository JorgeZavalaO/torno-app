-- CreateEnum
CREATE TYPE "public"."EstadoOT" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."OrdenTrabajo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" "public"."EstadoOT" NOT NULL DEFAULT 'DRAFT',
    "clienteId" TEXT,
    "cotizacionId" TEXT,
    "notas" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OTMaterial" (
    "id" TEXT NOT NULL,
    "otId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "qtyPlan" DECIMAL(12,3) NOT NULL,
    "qtyEmit" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "OTMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrdenTrabajo_codigo_key" ON "public"."OrdenTrabajo"("codigo");

-- CreateIndex
CREATE INDEX "OrdenTrabajo_estado_creadaEn_idx" ON "public"."OrdenTrabajo"("estado", "creadaEn");

-- CreateIndex
CREATE INDEX "OTMaterial_otId_idx" ON "public"."OTMaterial"("otId");

-- CreateIndex
CREATE UNIQUE INDEX "OTMaterial_otId_productoId_key" ON "public"."OTMaterial"("otId", "productoId");

-- AddForeignKey
ALTER TABLE "public"."OrdenTrabajo" ADD CONSTRAINT "OrdenTrabajo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenTrabajo" ADD CONSTRAINT "OrdenTrabajo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OTMaterial" ADD CONSTRAINT "OTMaterial_otId_fkey" FOREIGN KEY ("otId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OTMaterial" ADD CONSTRAINT "OTMaterial_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;
