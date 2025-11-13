-- AlterTable
ALTER TABLE "public"."Cotizacion" ADD COLUMN     "acabadoId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Cotizacion" ADD CONSTRAINT "Cotizacion_acabadoId_fkey" FOREIGN KEY ("acabadoId") REFERENCES "public"."ConfiguracionCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
