-- CreateEnum
CREATE TYPE "public"."EstadoSC" AS ENUM ('PENDING_ADMIN', 'PENDING_GERENCIA', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."EstadoOC" AS ENUM ('OPEN', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "contacto" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SolicitudCompra" (
    "id" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "otId" TEXT,
    "estado" "public"."EstadoSC" NOT NULL DEFAULT 'PENDING_ADMIN',
    "totalEstimado" DECIMAL(12,2),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SCItem" (
    "id" TEXT NOT NULL,
    "scId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "costoEstimado" DECIMAL(12,2),

    CONSTRAINT "SCItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrdenCompra" (
    "id" TEXT NOT NULL,
    "scId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" "public"."EstadoOC" NOT NULL DEFAULT 'OPEN',
    "total" DECIMAL(12,2) NOT NULL,
    "facturaUrl" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OCItem" (
    "id" TEXT NOT NULL,
    "ocId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OCItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_ruc_key" ON "public"."Proveedor"("ruc");

-- CreateIndex
CREATE INDEX "SolicitudCompra_estado_createdAt_idx" ON "public"."SolicitudCompra"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "SCItem_scId_idx" ON "public"."SCItem"("scId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_scId_key" ON "public"."OrdenCompra"("scId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_codigo_key" ON "public"."OrdenCompra"("codigo");

-- CreateIndex
CREATE INDEX "OrdenCompra_estado_fecha_idx" ON "public"."OrdenCompra"("estado", "fecha");

-- CreateIndex
CREATE INDEX "OCItem_ocId_idx" ON "public"."OCItem"("ocId");

-- AddForeignKey
ALTER TABLE "public"."SolicitudCompra" ADD CONSTRAINT "SolicitudCompra_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "public"."UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SCItem" ADD CONSTRAINT "SCItem_scId_fkey" FOREIGN KEY ("scId") REFERENCES "public"."SolicitudCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SCItem" ADD CONSTRAINT "SCItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenCompra" ADD CONSTRAINT "OrdenCompra_scId_fkey" FOREIGN KEY ("scId") REFERENCES "public"."SolicitudCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "public"."Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OCItem" ADD CONSTRAINT "OCItem_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES "public"."OrdenCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OCItem" ADD CONSTRAINT "OCItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;
