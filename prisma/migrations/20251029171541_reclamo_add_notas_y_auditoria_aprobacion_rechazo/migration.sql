-- AlterTable
ALTER TABLE "public"."Reclamo" ADD COLUMN     "aprobadoEn" TIMESTAMP(3),
ADD COLUMN     "aprobadoPorId" TEXT,
ADD COLUMN     "notasResolucion" TEXT,
ADD COLUMN     "rechazadoEn" TIMESTAMP(3),
ADD COLUMN     "rechazadoPorId" TEXT,
ALTER COLUMN "codigo" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Reclamo" ADD CONSTRAINT "Reclamo_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reclamo" ADD CONSTRAINT "Reclamo_rechazadoPorId_fkey" FOREIGN KEY ("rechazadoPorId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
