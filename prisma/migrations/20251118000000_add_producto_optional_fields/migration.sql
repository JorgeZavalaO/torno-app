-- AddProductoOptionalFields
-- Agregar campos opcionales a la tabla Producto

ALTER TABLE "Producto" ADD COLUMN "material" TEXT;
ALTER TABLE "Producto" ADD COLUMN "milimetros" DECIMAL(12,3);
ALTER TABLE "Producto" ADD COLUMN "pulgadas" DECIMAL(12,4);
