-- AlterTable
ALTER TABLE "public"."OCItem" ADD COLUMN     "scItemId" TEXT;

-- CreateIndex
CREATE INDEX "OrdenCompra_scId_idx" ON "public"."OrdenCompra"("scId");

-- AddForeignKey
ALTER TABLE "public"."OCItem" ADD CONSTRAINT "OCItem_scItemId_fkey" FOREIGN KEY ("scItemId") REFERENCES "public"."SCItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
