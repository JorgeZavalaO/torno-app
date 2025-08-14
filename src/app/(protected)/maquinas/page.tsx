import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getMachinesCached, getOpenOTsMini } from "@/app/server/queries/machines";
import MachinesClient from "./machines.client";
import { upsertMachine, deleteMachine, logMachineEvent, scheduleMaintenance, closeMaintenance } from "./actions";

export default async function MachinesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  // Reutilizo permisos de OT
  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/");

  const [rows, otsMini] = await Promise.all([getMachinesCached(), getOpenOTsMini()]);

  return (
    <MachinesClient
      canWrite={canWrite}
      rows={rows}
      ots={otsMini}
      actions={{ upsertMachine, deleteMachine, logMachineEvent, scheduleMaintenance, closeMaintenance }}
    />
  );
}
