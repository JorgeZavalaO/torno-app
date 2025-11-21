import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getProductsWithStock, getRecentMovements } from "@/app/server/queries/inventory";
import InventoryClient from "./inventory.client";
import { createProduct, updateProduct, deleteProduct, createMovement, importProducts, addEquivalentCode, removeEquivalentCode, getProductEquivalentCodes, searchProducts, registerInitialBalances } from "./actions";
import { prisma } from "@/app/lib/prisma";
import { getCostingParamByKey } from "@/app/server/queries/costing-params";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import { TipoCatalogo } from "@prisma/client";

export default async function InventoryPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "inventory.read"),
    userHasPermission(me.email, "inventory.write"),
  ]);
  if (!canRead) redirect("/");

  // Obtener opciones del catálogo centralizado
  const [uomOptions, categoryOptions, movementTypeOptions] = await Promise.all([
    getCatalogoOptions(TipoCatalogo.UNIDAD_MEDIDA),
    getCatalogoOptions(TipoCatalogo.CATEGORIA_PRODUCTO),
    getCatalogoOptions(TipoCatalogo.TIPO_MOVIMIENTO),
  ]);

  const [productsFromDb, recents] = await Promise.all([
    getProductsWithStock(),
    getRecentMovements(50),
  ]);

  const products = productsFromDb;

  // Para selects: lista de SKUs
  const productOptions = await prisma.producto.findMany({
    orderBy: { nombre: "asc" },
    select: { sku: true, nombre: true, uom: true },
  });

  // Moneda actual del sistema
  const currencyParam = await getCostingParamByKey("currency");
  const currency = String(currencyParam?.valueText ?? "USD").toUpperCase();

  return (
    <InventoryClient
      currency={currency}
      canWrite={canWrite}
      products={products}
      recentMovs={recents}
      productOptions={productOptions}
      uomOptions={uomOptions}
      categoryOptions={categoryOptions}
      movementTypeOptions={movementTypeOptions}
      actions={{ createProduct, updateProduct, deleteProduct, createMovement, importProducts, addEquivalentCode, removeEquivalentCode, getProductEquivalentCodes, searchProducts, registerInitialBalances }}
    />
  );
}
