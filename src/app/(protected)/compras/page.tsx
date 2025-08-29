import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getProvidersCached, getSCsCached, getOCsCached } from "@/app/server/queries/purchases";
import { prisma } from "@/app/lib/prisma";

import { createProvider, createSC, setSCState, createOC, receiveOC, updateProvider, deleteProvider, updateSCCosts } from "./actions";
import ComprasClient from "./purchases.client";
import { getCostingParamByKey } from "@/app/server/queries/costing-params";

export default async function PurchasesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "purchases.read"),
    userHasPermission(me.email, "purchases.write"),
  ]);
  if (!canRead) redirect("/");

  // datos
  const [providers, scs, ocs, products] = await Promise.all([
    getProvidersCached(),
    getSCsCached(),
    getOCsCached(),
    prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { sku: true, nombre: true, uom: true } }),
  ]);

  const currencyParam = await getCostingParamByKey("currency");
  const currency = String(currencyParam?.valueText ?? "PEN").toUpperCase();

  return (
    <ComprasClient
  currency={currency}
      canWrite={canWrite}
      providers={providers.map(p => ({
        ...p,
        email: p.email ?? undefined,
        telefono: p.telefono ?? undefined,
        direccion: p.direccion ?? undefined,
      }))}
      scs={scs}
      ocs={ocs}
      products={products}
      actions={{ createProvider, createSC, setSCState, createOC, receiveOC, updateProvider, deleteProvider, updateSCCosts }}
    />
  );
}
