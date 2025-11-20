-- AlterTable
ALTER TABLE "public"."ToolInstance" ADD COLUMN     "maquinaId" TEXT;

-- CreateIndex
CREATE INDEX "ToolInstance_maquinaId_idx" ON "public"."ToolInstance"("maquinaId");

-- AddForeignKey
ALTER TABLE "public"."ToolInstance" ADD CONSTRAINT "ToolInstance_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "public"."Maquina"("id") ON DELETE SET NULL ON UPDATE CASCADE;
