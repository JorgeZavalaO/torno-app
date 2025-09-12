-- CreateEnum
CREATE TYPE "public"."TipoCatalogo" AS ENUM ('UNIDAD_MEDIDA', 'CATEGORIA_PRODUCTO', 'TIPO_MOVIMIENTO', 'ESTADO_OT', 'PRIORIDAD_OT', 'TIPO_ACABADO', 'ESTADO_MAQUINA', 'EVENTO_MAQUINA', 'CATEGORIA_MAQUINA', 'TIPO_MANTENIMIENTO', 'ESTADO_MANTENIMIENTO', 'ESTADO_SC', 'ESTADO_OC', 'ESTADO_COTIZACION', 'MONEDA', 'TIPO_PARAMETRO');

-- CreateTable
CREATE TABLE "public"."ProductoCodigoEquivalente" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sistema" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoCodigoEquivalente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConfiguracionCatalogo" (
    "id" TEXT NOT NULL,
    "tipo" "public"."TipoCatalogo" NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icono" TEXT,
    "propiedades" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoCodigoEquivalente_productoId_idx" ON "public"."ProductoCodigoEquivalente"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoCodigoEquivalente_sistema_codigo_key" ON "public"."ProductoCodigoEquivalente"("sistema", "codigo");

-- CreateIndex
CREATE INDEX "ConfiguracionCatalogo_tipo_activo_orden_idx" ON "public"."ConfiguracionCatalogo"("tipo", "activo", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionCatalogo_tipo_codigo_key" ON "public"."ConfiguracionCatalogo"("tipo", "codigo");

-- AddForeignKey
ALTER TABLE "public"."ProductoCodigoEquivalente" ADD CONSTRAINT "ProductoCodigoEquivalente_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE CASCADE ON UPDATE CASCADE;
