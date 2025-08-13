-- AlterEnum
ALTER TYPE "public"."TipoMovimiento" ADD VALUE 'INGRESO_OT';

-- AlterTable
ALTER TABLE "public"."OrdenTrabajo" ADD COLUMN     "acabado" TEXT;

-- CreateTable
CREATE TABLE "public"."OTPieza" (
    "id" TEXT NOT NULL,
    "otId" TEXT NOT NULL,
    "productoId" TEXT,
    "descripcion" TEXT,
    "qtyPlan" DECIMAL(12,3) NOT NULL,
    "qtyHecha" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "OTPieza_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OTPieza_otId_idx" ON "public"."OTPieza"("otId");

-- AddForeignKey
ALTER TABLE "public"."OTPieza" ADD CONSTRAINT "OTPieza_otId_fkey" FOREIGN KEY ("otId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OTPieza" ADD CONSTRAINT "OTPieza_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE SET NULL ON UPDATE CASCADE;
