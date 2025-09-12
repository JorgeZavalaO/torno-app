import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getOTDetail, getProductsMini, getClientsMini } from "@/app/server/queries/ot";
import OTDetailClient from "./ot-detail.client";
import {
  updateOTHeader,
  emitOTMaterials,
  startOTManually,
  createManualSCForOT,
  recomputeOTState
} from "../actions";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import type { TipoCatalogo } from "@prisma/client";

export default async function OTDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/ots");

  const [detail, products, clients, prioridadOptions, acabadoOptions] = await Promise.all([
    getOTDetail(id),
    getProductsMini(),
    getClientsMini(),
    getCatalogoOptions("PRIORIDAD_OT" as TipoCatalogo),
    getCatalogoOptions("TIPO_ACABADO" as TipoCatalogo),
  ]);
  if (!detail) redirect("/ots");

  return (
    <OTDetailClient
      canWrite={canWrite}
      detail={detail}
      products={products}
      clients={clients}
      actions={{
        updateOTHeader,
        emitOTMaterials,
        startOTManually,
        createManualSCForOT,
        recompute: recomputeOTState,
      }}
      prioridadOptions={prioridadOptions}
      acabadoOptions={acabadoOptions}
    />
  );
}
