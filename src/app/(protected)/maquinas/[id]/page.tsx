import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getMachineDetail } from "@/app/server/queries/machines";
import MachineDetailClient from "./machine-detail.client";
import { scheduleMaintenance, closeMaintenance, upsertMachine } from "../actions";

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/maquinas");

  const detail = await getMachineDetail(id);
  if (!detail) redirect("/maquinas");

  return (
    <MachineDetailClient
      canWrite={canWrite}
      detail={detail}
      actions={{ scheduleMaintenance, closeMaintenance, upsertMachine }}
    />
  );
}
