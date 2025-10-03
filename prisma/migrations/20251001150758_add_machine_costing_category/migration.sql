-- CreateTable
CREATE TABLE "public"."MachineCostingCategory" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "laborCost" DECIMAL(18,6) NOT NULL,
    "deprPerHour" DECIMAL(18,6) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineCostingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MachineCostingCategory_categoria_key" ON "public"."MachineCostingCategory"("categoria");

-- CreateIndex
CREATE INDEX "MachineCostingCategory_activo_idx" ON "public"."MachineCostingCategory"("activo");
