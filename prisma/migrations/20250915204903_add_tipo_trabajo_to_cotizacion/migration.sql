-- AlterEnum
ALTER TYPE "public"."TipoCatalogo" ADD VALUE 'TIPO_TRABAJO';

-- AlterTable
ALTER TABLE "public"."Cotizacion" ADD COLUMN     "tipoTrabajoId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Cotizacion" ADD CONSTRAINT "Cotizacion_tipoTrabajoId_fkey" FOREIGN KEY ("tipoTrabajoId") REFERENCES "public"."ConfiguracionCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
