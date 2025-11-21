-- CreateTable
CREATE TABLE "public"."ProductoVidaCategoria" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "machineCategoryId" TEXT NOT NULL,
    "vidaUtil" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoVidaCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoVidaCategoria_productoId_idx" ON "public"."ProductoVidaCategoria"("productoId");

-- CreateIndex
CREATE INDEX "ProductoVidaCategoria_machineCategoryId_idx" ON "public"."ProductoVidaCategoria"("machineCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoVidaCategoria_productoId_machineCategoryId_key" ON "public"."ProductoVidaCategoria"("productoId", "machineCategoryId");

-- AddForeignKey
ALTER TABLE "public"."ProductoVidaCategoria" ADD CONSTRAINT "ProductoVidaCategoria_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("sku") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductoVidaCategoria" ADD CONSTRAINT "ProductoVidaCategoria_machineCategoryId_fkey" FOREIGN KEY ("machineCategoryId") REFERENCES "public"."MachineCostingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
