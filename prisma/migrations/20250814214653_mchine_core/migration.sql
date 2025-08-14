-- CreateEnum
CREATE TYPE "public"."MaquinaEstado" AS ENUM ('ACTIVA', 'MANTENIMIENTO', 'BAJA');

-- CreateEnum
CREATE TYPE "public"."MaquinaEventoTipo" AS ENUM ('USO', 'PARO', 'MANTENIMIENTO', 'AVERIA', 'DISPONIBLE');

-- CreateTable
CREATE TABLE "public"."Maquina" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "estado" "public"."MaquinaEstado" NOT NULL DEFAULT 'ACTIVA',
    "ubicacion" TEXT,
    "fabricante" TEXT,
    "modelo" TEXT,
    "serie" TEXT,
    "capacidad" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maquina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaquinaEvento" (
    "id" TEXT NOT NULL,
    "maquinaId" TEXT NOT NULL,
    "tipo" "public"."MaquinaEventoTipo" NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),
    "horas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nota" TEXT,
    "otId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaquinaEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaquinaMantenimiento" (
    "id" TEXT NOT NULL,
    "maquinaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaProg" TIMESTAMP(3) NOT NULL,
    "fechaReal" TIMESTAMP(3),
    "costo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaquinaMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Maquina_codigo_key" ON "public"."Maquina"("codigo");

-- AddForeignKey
ALTER TABLE "public"."MaquinaEvento" ADD CONSTRAINT "MaquinaEvento_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "public"."Maquina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaquinaEvento" ADD CONSTRAINT "MaquinaEvento_otId_fkey" FOREIGN KEY ("otId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaquinaEvento" ADD CONSTRAINT "MaquinaEvento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaquinaMantenimiento" ADD CONSTRAINT "MaquinaMantenimiento_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "public"."Maquina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
