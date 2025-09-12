import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getMachinesCached } from "@/app/server/queries/machines";
import MachinesClient from "./machines.client";
import { upsertMachine, deleteMachine, scheduleMaintenance, closeMaintenance, logMachineEvent } from "./actions";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import type { TipoCatalogo } from "@prisma/client";

export default async function MachinesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/");

  const [rows, statusOptions, eventOptions] = await Promise.all([
    getMachinesCached(),
    getCatalogoOptions("ESTADO_MAQUINA" as TipoCatalogo),
    getCatalogoOptions("EVENTO_MAQUINA" as TipoCatalogo),
  ]);

  return (
    <MachinesClient
      canWrite={canWrite}
      rows={rows}
      statusOptions={statusOptions}
      eventOptions={eventOptions}
      actions={{ 
        upsertMachine, 
        deleteMachine, 
        scheduleMaintenance, 
        closeMaintenance, 
        logMachineEvent 
      }}
    />
  );
}
