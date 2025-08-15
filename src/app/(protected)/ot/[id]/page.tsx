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

export default async function OTDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/ots");

  const [detail, products, clients] = await Promise.all([
    getOTDetail(id),
    getProductsMini(),
    getClientsMini(),
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
    />
  );
}
