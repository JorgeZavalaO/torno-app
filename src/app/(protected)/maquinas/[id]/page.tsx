import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getMachineDetail, getOpenOTsMini } from "@/app/server/queries/machines";
import MachineDetailClient from "./machine-detail.client";
import { logMachineEvent, scheduleMaintenance, closeMaintenance, upsertMachine } from "../actions";

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
  const ots = await getOpenOTsMini();

  return (
    <MachineDetailClient
      canWrite={canWrite}
      detail={detail}
      ots={ots}
      actions={{ logMachineEvent, scheduleMaintenance, closeMaintenance, upsertMachine }}
    />
  );
}
