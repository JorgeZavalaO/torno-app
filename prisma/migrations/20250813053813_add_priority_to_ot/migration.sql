-- CreateEnum
CREATE TYPE "public"."PrioridadOT" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "public"."OrdenTrabajo" ADD COLUMN     "prioridad" "public"."PrioridadOT" NOT NULL DEFAULT 'MEDIUM';
