-- AddProductCategories
-- Agregar nuevos valores al enum CategoriaProducto

ALTER TYPE "CategoriaProducto" ADD VALUE IF NOT EXISTS 'PIEZA_FABRICADA';
ALTER TYPE "CategoriaProducto" ADD VALUE IF NOT EXISTS 'HERRAMIENTA';
ALTER TYPE "CategoriaProducto" ADD VALUE IF NOT EXISTS 'INSUMO';
ALTER TYPE "CategoriaProducto" ADD VALUE IF NOT EXISTS 'REFACCION';
