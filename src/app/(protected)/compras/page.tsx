import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getProvidersCached, getSCsCached, getOCsCached } from "@/app/server/queries/purchases";
import { prisma } from "@/app/lib/prisma";

import { createProvider, createSC, setSCState, createOC, receiveOC, updateProvider, deleteProvider, updateSCCosts } from "./actions";
import ComprasClient from "./purchases.client";

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

  return (
    <ComprasClient
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
