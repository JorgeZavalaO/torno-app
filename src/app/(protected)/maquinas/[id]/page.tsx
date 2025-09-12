import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getMachineDetail } from "@/app/server/queries/machines";
import MachineDetailClient from "./machine-detail.client";
import { scheduleMaintenance, closeMaintenance, upsertMachine, updateMaintenance } from "../actions";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import type { TipoCatalogo } from "@prisma/client";

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/maquinas");

  const [detail, statusOptions, eventOptions, maintenanceOptions] = await Promise.all([
    getMachineDetail(id),
    getCatalogoOptions("ESTADO_MAQUINA" as TipoCatalogo),
    getCatalogoOptions("EVENTO_MAQUINA" as TipoCatalogo),
    getCatalogoOptions("TIPO_MANTENIMIENTO" as TipoCatalogo),
  ]);
  if (!detail) redirect("/maquinas");

  return (
    <MachineDetailClient
      canWrite={canWrite}
      detail={detail}
      statusOptions={statusOptions}
      eventOptions={eventOptions}
      maintenanceOptions={maintenanceOptions}
      actions={{ scheduleMaintenance, closeMaintenance, upsertMachine, updateMaintenance }}
    />
  );
}
