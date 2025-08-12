-- CreateEnum
CREATE TYPE "public"."QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."Cotizacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "solicitudId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL,
    "giPct" DECIMAL(6,4) NOT NULL,
    "marginPct" DECIMAL(6,4) NOT NULL,
    "hourlyRate" DECIMAL(18,6) NOT NULL,
    "kwhRate" DECIMAL(18,6) NOT NULL,
    "deprPerHour" DECIMAL(18,6) NOT NULL,
    "toolingPerPc" DECIMAL(18,6) NOT NULL,
    "rentPerHour" DECIMAL(18,6) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "materials" DECIMAL(18,2) NOT NULL,
    "hours" DECIMAL(12,2) NOT NULL,
    "kwh" DECIMAL(12,2) NOT NULL,
    "costDirect" DECIMAL(18,2) NOT NULL,
    "giAmount" DECIMAL(18,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "marginAmount" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "status" "public"."QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cotizacion_clienteId_idx" ON "public"."Cotizacion"("clienteId");

-- CreateIndex
CREATE INDEX "Cotizacion_status_createdAt_idx" ON "public"."Cotizacion"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
