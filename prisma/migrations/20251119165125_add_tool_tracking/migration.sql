-- CreateEnum
CREATE TYPE "public"."ToolState" AS ENUM ('NUEVA', 'EN_USO', 'AFILADO', 'DESGASTADA', 'ROTA', 'PERDIDA');

-- AlterTable
ALTER TABLE "public"."Producto" ADD COLUMN     "requiereTrazabilidad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vidaUtilEstimada" DECIMAL(12,3);

-- CreateTable
CREATE TABLE "public"."ToolInstance" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "estado" "public"."ToolState" NOT NULL DEFAULT 'NUEVA',
    "ubicacion" TEXT,
    "costoInicial" DECIMAL(12,2) NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "vidaUtilEstimada" DECIMAL(12,3),
    "vidaAcumulada" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "ToolInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OTToolUsage" (
    "id" TEXT NOT NULL,
    "otId" TEXT NOT NULL,
    "toolInstanceId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "cantidadProducida" DECIMAL(12,3) NOT NULL,
    "estadoInicial" "public"."ToolState" NOT NULL,
    "estadoFinal" "public"."ToolState",
    "notas" TEXT,

    CONSTRAINT "OTToolUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolInstance_codigo_key" ON "public"."ToolInstance"("codigo");

-- CreateIndex
CREATE INDEX "ToolInstance_productoId_idx" ON "public"."ToolInstance"("productoId");

-- CreateIndex
CREATE INDEX "ToolInstance_estado_idx" ON "public"."ToolInstance"("estado");

-- CreateIndex
CREATE INDEX "OTToolUsage_otId_idx" ON "public"."OTToolUsage"("otId");

-- CreateIndex
CREATE INDEX "OTToolUsage_toolInstanceId_idx" ON "public"."OTToolUsage"("toolInstanceId");

-- AddForeignKey
ALTER TABLE "public"."ToolInstance" ADD CONSTRAINT "ToolInstance_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OTToolUsage" ADD CONSTRAINT "OTToolUsage_otId_fkey" FOREIGN KEY ("otId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OTToolUsage" ADD CONSTRAINT "OTToolUsage_toolInstanceId_fkey" FOREIGN KEY ("toolInstanceId") REFERENCES "public"."ToolInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
