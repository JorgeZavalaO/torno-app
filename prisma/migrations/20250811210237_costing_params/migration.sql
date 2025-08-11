-- CreateEnum
CREATE TYPE "public"."ParamType" AS ENUM ('NUMBER', 'PERCENT', 'CURRENCY', 'TEXT');

-- CreateTable
CREATE TABLE "public"."CostingParam" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "group" TEXT DEFAULT 'cotizador',
    "type" "public"."ParamType" NOT NULL,
    "valueNumber" DECIMAL(18,6),
    "valueText" TEXT,
    "unit" TEXT,
    "min" DECIMAL(18,6),
    "max" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostingParam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostingParam_key_key" ON "public"."CostingParam"("key");
