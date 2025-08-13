-- CreateTable
CREATE TABLE "public"."ParteProduccion" (
    "id" TEXT NOT NULL,
    "otId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "horas" DECIMAL(10,2) NOT NULL,
    "maquina" TEXT,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParteProduccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParteProduccion_otId_fecha_idx" ON "public"."ParteProduccion"("otId", "fecha");

-- AddForeignKey
ALTER TABLE "public"."ParteProduccion" ADD CONSTRAINT "ParteProduccion_otId_fkey" FOREIGN KEY ("otId") REFERENCES "public"."OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParteProduccion" ADD CONSTRAINT "ParteProduccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
