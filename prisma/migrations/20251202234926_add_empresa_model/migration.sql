-- CreateTable
CREATE TABLE "public"."Empresa" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "nombre" TEXT NOT NULL DEFAULT 'Mi Empresa',
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "web" TEXT,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);
