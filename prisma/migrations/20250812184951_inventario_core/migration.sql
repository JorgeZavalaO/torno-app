-- CreateEnum
CREATE TYPE "public"."CategoriaProducto" AS ENUM ('MATERIA_PRIMA', 'HERRAMIENTA_CORTE', 'CONSUMIBLE', 'REPUESTO');

-- CreateEnum
CREATE TYPE "public"."TipoMovimiento" AS ENUM ('INGRESO_COMPRA', 'INGRESO_AJUSTE', 'SALIDA_AJUSTE', 'SALIDA_OT');

-- CreateTable
CREATE TABLE "public"."Producto" (
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "public"."CategoriaProducto" NOT NULL,
    "uom" TEXT NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "stockMinimo" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("sku")
);

-- CreateTable
CREATE TABLE "public"."Movimiento" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "public"."TipoMovimiento" NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "refTabla" TEXT,
    "refId" TEXT,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movimiento_productoId_fecha_idx" ON "public"."Movimiento"("productoId", "fecha");

-- AddForeignKey
ALTER TABLE "public"."Movimiento" ADD CONSTRAINT "Movimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;
