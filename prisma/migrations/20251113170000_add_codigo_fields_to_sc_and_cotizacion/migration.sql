-- Add "codigo" column to Cotizacion and SolicitudCompra and add unique indexes

-- Cotizacion
ALTER TABLE IF EXISTS "public"."Cotizacion" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'Cotizacion_codigo_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Cotizacion_codigo_key" ON "public"."Cotizacion" ("codigo");
  END IF;
END$$;

-- SolicitudCompra
ALTER TABLE IF EXISTS "public"."SolicitudCompra" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'SolicitudCompra_codigo_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "SolicitudCompra_codigo_key" ON "public"."SolicitudCompra" ("codigo");
  END IF;
END$$;
