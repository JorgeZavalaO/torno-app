import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getOTListCached } from "@/app/server/queries/ot";
import { prisma } from "@/app/lib/prisma";
import { getClientsCached } from "@/app/server/queries/clients";
import OTClient from "./ot.client";
import { createOT, setOTState, addMaterial, issueMaterials, createSCFromShortages } from "./actions";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import type { TipoCatalogo } from "@prisma/client";

export default async function OTPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/");

  const [rows, products, clients, prioridadOptions, acabadoOptions] = await Promise.all([
    getOTListCached(),
    prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { sku: true, nombre: true, uom: true, categoria: true } }),
    getClientsCached().then(cs => cs.map(c => ({ id: c.id, nombre: c.nombre }))),
    getCatalogoOptions("PRIORIDAD_OT" as TipoCatalogo),
    getCatalogoOptions("TIPO_ACABADO" as TipoCatalogo),
  ]);

  return (
    <OTClient
      canWrite={canWrite}
      rows={rows}
      products={products}
      clients={clients}
      prioridadOptions={prioridadOptions}
      acabadoOptions={acabadoOptions}
      actions={{ createOT, setOTState, addMaterial, issueMaterials, createSCFromShortages }}
    />
  );
}
