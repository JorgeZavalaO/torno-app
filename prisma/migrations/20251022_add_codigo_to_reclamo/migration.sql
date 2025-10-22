-- AlterTable: Add codigo column to Reclamo
ALTER TABLE "public"."Reclamo" ADD COLUMN "codigo" TEXT;

-- Generate codes for existing records using a temporary table with ROW_NUMBER
WITH numbered_reclamos AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (ORDER BY "createdAt") as row_num,
    TO_CHAR("createdAt", 'YYYY') as year
  FROM "public"."Reclamo"
)
UPDATE "public"."Reclamo" r
SET "codigo" = 'REC-' || nr.year || '-' || LPAD(nr.row_num::text, 4, '0')
FROM numbered_reclamos nr
WHERE r.id = nr.id AND r."codigo" IS NULL;

-- Make codigo unique and not null
ALTER TABLE "public"."Reclamo" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX "Reclamo_codigo_key" ON "public"."Reclamo"("codigo");
