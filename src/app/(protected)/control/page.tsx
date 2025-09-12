import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getProductionOverviewCached, getQuickLogData } from "@/app/server/queries/production";
import ControlClient from "./control.client";
import { logWorkAndPieces } from "@/app/(protected)/control/actions";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import type { TipoCatalogo } from "@prisma/client";

export default async function ControlPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  // Puedes definir permisos propios; por compatibilidad uso los de OT.
  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/");

  const [overview, quicklog, prioridadOptions, estadoOptions] = await Promise.all([
    getProductionOverviewCached(14),
    getQuickLogData(),
    getCatalogoOptions("PRIORIDAD_OT" as TipoCatalogo),
    getCatalogoOptions("ESTADO_OT" as TipoCatalogo),
  ]);

  return (
    <ControlClient
      canWrite={canWrite}
      overview={overview}
      quicklog={quicklog}
      prioridadOptions={prioridadOptions}
      estadoOptions={estadoOptions}
      actions={{ logWorkAndPieces }}
    />
  );
}
