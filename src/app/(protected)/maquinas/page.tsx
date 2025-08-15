import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getMachinesCached } from "@/app/server/queries/machines";
import MachinesClient from "./machines.client";
import { upsertMachine, deleteMachine, scheduleMaintenance, closeMaintenance } from "./actions";

export default async function MachinesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/");

  const rows = await getMachinesCached();

  return (
    <MachinesClient
      canWrite={canWrite}
      rows={rows}
      actions={{ upsertMachine, deleteMachine, scheduleMaintenance, closeMaintenance }}
    />
  );
}
