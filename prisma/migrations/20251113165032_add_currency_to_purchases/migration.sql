-- AlterTable
ALTER TABLE "public"."OrdenCompra" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PEN';

-- AlterTable
ALTER TABLE "public"."Proveedor" ADD COLUMN     "currency" TEXT DEFAULT 'PEN';

-- AlterTable
ALTER TABLE "public"."SolicitudCompra" ADD COLUMN     "currency" TEXT DEFAULT 'PEN';
