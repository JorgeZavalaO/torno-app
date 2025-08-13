import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getOTDetailFull } from "@/app/server/queries/ot";
import { issueMaterials, logProduction, createSCFromShortages, setOTState, addMaterial, updateOTMeta } from "../actions";
import { getClientsCached } from "@/app/server/queries/clients";
import { prisma } from "@/app/lib/prisma";
import OTDetailClient from "./ot-detail.client";

export default async function OTDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/ot");

  const detail = await getOTDetailFull(id);
  if (!detail) redirect("/ot");

  const [products, clients] = await Promise.all([
    prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { sku: true, nombre: true, uom: true } }),
    getClientsCached().then(cs => cs.map(c => ({ id: c.id, nombre: c.nombre }))),
  ]);

  return (
    <OTDetailClient
      canWrite={canWrite}
      detail={detail}
      products={products}
      actions={{ issueMaterials, logProduction, createSCFromShortages, setOTState, addMaterial, updateOTMeta }}
      clients={clients}
    />
  );
}
