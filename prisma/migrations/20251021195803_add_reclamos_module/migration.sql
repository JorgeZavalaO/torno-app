-- CreateEnum
CREATE TYPE "public"."EstadoReclamo" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED_TO_OT');

-- CreateEnum
CREATE TYPE "public"."PrioridadReclamo" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "public"."Reclamo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "public"."PrioridadReclamo" NOT NULL DEFAULT 'MEDIA',
    "estado" "public"."EstadoReclamo" NOT NULL DEFAULT 'PENDING',
    "categoria" TEXT,
    "archivos" TEXT[],
    "otId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reclamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reclamo_otId_key" ON "public"."Reclamo"("otId");

-- CreateIndex
CREATE INDEX "Reclamo_clienteId_estado_idx" ON "public"."Reclamo"("clienteId", "estado");

-- AddForeignKey
ALTER TABLE "public"."Reclamo" ADD CONSTRAINT "Reclamo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reclamo" ADD CONSTRAINT "Reclamo_otId_fkey" FOREIGN KEY ("otId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
