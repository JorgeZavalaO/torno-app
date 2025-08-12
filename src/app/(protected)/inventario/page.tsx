import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getProductsWithStock, getRecentMovements } from "@/app/server/queries/inventory";
import InventoryClient from "./inventory.client";
import { pingInventory, createProduct, updateProduct, deleteProduct, createMovement } from "./actions";
import { prisma } from "@/app/lib/prisma";

export default async function InventoryPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "inventory.read"),
    userHasPermission(me.email, "inventory.write"),
  ]);
  if (!canRead) redirect("/");

  await pingInventory();

  const [productsFromDb, recents] = await Promise.all([
    getProductsWithStock(),
    getRecentMovements(50),
  ]);

  const products = productsFromDb.map((p) => ({
    ...p,
    costo: p.costo.toNumber(),
    stockMinimo: p.stockMinimo?.toNumber() ?? null,
  }));

  // Para selects: lista de SKUs
  const productOptions = await prisma.producto.findMany({
    orderBy: { nombre: "asc" },
    select: { sku: true, nombre: true, uom: true },
  });

  return (
    <InventoryClient
      canWrite={canWrite}
      products={products}
      recentMovs={recents}
      productOptions={productOptions}
      actions={{ createProduct, updateProduct, deleteProduct, createMovement }}
    />
  );
}
