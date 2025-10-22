/*
  Warnings:

  - Added the required column `tipoReclamo` to the `Reclamo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TipoReclamo" AS ENUM ('OT_ATENDIDA', 'NUEVO_RECLAMO');

-- CreateEnum
CREATE TYPE "public"."TipoResolucion" AS ENUM ('OT_PENDIENTE', 'OT_NUEVA', 'REEMBOLSO', 'AJUSTE_STOCK', 'OTRO');

-- DropIndex
DROP INDEX "public"."Reclamo_clienteId_estado_idx";

-- AlterTable
ALTER TABLE "public"."Reclamo" ADD COLUMN     "otReferenciaId" TEXT,
ADD COLUMN     "tipoReclamo" "public"."TipoReclamo" NOT NULL,
ADD COLUMN     "tipoResolucion" "public"."TipoResolucion";

-- CreateIndex
CREATE INDEX "Reclamo_clienteId_idx" ON "public"."Reclamo"("clienteId");

-- CreateIndex
CREATE INDEX "Reclamo_estado_idx" ON "public"."Reclamo"("estado");

-- CreateIndex
CREATE INDEX "Reclamo_otReferenciaId_idx" ON "public"."Reclamo"("otReferenciaId");

-- AddForeignKey
ALTER TABLE "public"."Reclamo" ADD CONSTRAINT "Reclamo_otReferenciaId_fkey" FOREIGN KEY ("otReferenciaId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
