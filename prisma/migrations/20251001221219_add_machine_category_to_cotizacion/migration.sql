-- AlterTable
ALTER TABLE "public"."Cotizacion" ADD COLUMN     "machineCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Cotizacion" ADD CONSTRAINT "Cotizacion_machineCategoryId_fkey" FOREIGN KEY ("machineCategoryId") REFERENCES "public"."MachineCostingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
