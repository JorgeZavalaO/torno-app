-- AlterTable
ALTER TABLE "public"."OrdenTrabajo" ADD COLUMN     "costLabor" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "costMaterials" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "costOverheads" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "costParams" JSONB,
ADD COLUMN     "costQuoteLabor" DECIMAL(18,2),
ADD COLUMN     "costQuoteMaterials" DECIMAL(18,2),
ADD COLUMN     "costQuoteOverheads" DECIMAL(18,2),
ADD COLUMN     "costQuoteTotal" DECIMAL(18,2),
ADD COLUMN     "costTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PEN';
