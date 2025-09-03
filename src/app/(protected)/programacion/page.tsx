import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getOTListCached, type OTListRow } from "@/app/server/queries/ot";
import { prisma } from "@/app/lib/prisma";
import ProgramacionClient, { OTItem } from "./programacion.client";
import { Calendar } from "lucide-react";

export default async function OTProgramacionPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
  ]);
  if (!canRead) redirect("/");

  const rows: OTListRow[] = await getOTListCached();

  // Horas trabajadas por OT (agregado rápido)
  const horasByOt = await prisma.parteProduccion.groupBy({
    by: ["otId"],
    _sum: { horas: true },
  }).then(rows => new Map(rows.map(r => [r.otId, Number(r._sum.horas ?? 0)])));

  const items: OTItem[] = rows
    .filter(r => !!r.fechaLimite)
    .map(r => ({
      id: r.id,
      codigo: r.codigo,
      estado: r.estado,
      prioridad: r.prioridad,
      clienteNombre: r.clienteNombre ?? null,
      fechaLimite: new Date(r.fechaLimite as unknown as string | Date).toISOString(),
      horasTrab: horasByOt.get(r.id) ?? 0,
  piezasPend: r.piezasPend ?? undefined,
  progresoPiezas: r.progresoPiezas ?? undefined,
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header estilo moderno */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Programación</h1>
                  <p className="text-xs text-gray-500">Gestión de órdenes de trabajo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgramacionClient items={items} />
      </div>
    </div>
  );
}
