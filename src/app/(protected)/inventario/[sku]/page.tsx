import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getProductKardex, getMachineCategories } from "@/app/server/queries/inventory";
import { getCostingParamByKey } from "@/app/server/queries/costing-params";
import { ProductDetailClient } from "./product-detail.client";
import { addEquivalentCode, removeEquivalentCode, addMachineLife, removeMachineLife, getProductEquivalentCodes } from "../actions";
import { createToolInstance } from "../tools-actions";

export default async function ProductKardexPage({ params }: { params: Promise<{ sku: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");
  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "inventory.read"),
    userHasPermission(me.email, "inventory.write"),
  ]);
  if (!canRead) redirect("/");

  const { sku: rawSku } = await params;
  const sku = decodeURIComponent(rawSku);
  const [data, categories] = await Promise.all([
    getProductKardex(sku),
    getMachineCategories(),
  ]);
  if (!data) redirect("/inventario");

  // Obtener la moneda del sistema desde parámetros
  const currencyParam = await getCostingParamByKey("currency");
  const systemCurrency = currencyParam?.valueText || "USD";

  const { producto, stock, movs, equivalentes } = data as typeof data & { 
    equivalentes: { id: string; sistema: string; codigo: string; descripcion?: string | null }[];
    producto: { vidasUtilesCategoria: { id: string; machineCategoryId: string; vidaUtil: number | string | { toString: () => string }; machineCategory: { id: string; categoria: string } }[] }
  };

  return (
    <ProductDetailClient
      producto={producto}
      stock={stock}
      movs={movs}
      equivalentes={equivalentes}
      systemCurrency={systemCurrency}
      categories={categories}
      canWrite={canWrite}
      actions={{
        addEquivalentCode,
        removeEquivalentCode,
        addMachineLife,
        removeMachineLife,
        createToolInstance,
        getProductEquivalentCodes,
      }}
    />
  );
}
