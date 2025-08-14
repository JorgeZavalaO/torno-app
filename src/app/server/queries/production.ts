import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

/** Helpers */
function fmtDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

type SeriePoint = { day: string; horas: number };
type MachineRow = { maquina: string; horas: number };
type OperatorRow = { usuario: string; horas: number };

export const getProductionOverviewCached = cache(
  async (days = 14) => {
    const until = new Date();
    const from = startOfDay(addDays(until, -days + 1));

    // Partes (horas)
    const partes = await prisma.parteProduccion.findMany({
      where: { fecha: { gte: from, lte: until } },
      select: {
        fecha: true,
        horas: true,
        maquina: true,
        usuario: { select: { displayName: true, email: true } },
      },
    });

    // Series por día
    const mapByDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = fmtDay(addDays(from, i));
      mapByDay.set(d, 0);
    }
    for (const p of partes) {
      const d = fmtDay(new Date(p.fecha));
      mapByDay.set(d, (mapByDay.get(d) || 0) + Number(p.horas));
    }
    const series: SeriePoint[] = Array.from(mapByDay.entries()).map(
      ([day, horas]) => ({ day, horas })
    );

    // Top máquinas
    const machineMap = new Map<string, number>();
    for (const p of partes) {
      const key = (p.maquina || "—").trim() || "—";
      machineMap.set(key, (machineMap.get(key) || 0) + Number(p.horas));
    }
    const machines: MachineRow[] = Array.from(machineMap.entries())
      .map(([maquina, horas]) => ({ maquina, horas }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);

    // Top operadores
    const opMap = new Map<string, number>();
    for (const p of partes) {
      const name = p.usuario?.displayName || p.usuario?.email || "—";
      opMap.set(name, (opMap.get(name) || 0) + Number(p.horas));
    }
    const operators: OperatorRow[] = Array.from(opMap.entries())
      .map(([usuario, horas]) => ({ usuario, horas }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);

    // OTs (WIP y avance)
    const ots = await prisma.ordenTrabajo.findMany({
      where: { estado: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { creadaEn: "desc" },
      include: {
        piezas: { select: { qtyPlan: true, qtyHecha: true } },
        cliente: { select: { nombre: true } },
      },
    });

    const wip = ots.map((o) => {
      const plan = o.piezas.reduce((s, p) => s + Number(p.qtyPlan), 0);
      const hecho = o.piezas.reduce((s, p) => s + Number(p.qtyHecha), 0);
      const pct = plan > 0 ? Math.min(100, (hecho / plan) * 100) : 0;
      return {
        id: o.id,
        codigo: o.codigo,
        estado: o.estado,
        prioridad: o.prioridad,
        clienteNombre: o.cliente?.nombre ?? null,
        piezasPlan: plan,
        piezasHechas: hecho,
        avancePct: pct,
        creadaEn: o.creadaEn,
      };
    });

    const totalPlan = wip.reduce((s, x) => s + x.piezasPlan, 0);
    const totalHecho = wip.reduce((s, x) => s + x.piezasHechas, 0);

    // KPIs
    const kpis = {
      horasUlt7d: series.slice(-7).reduce((s, p) => s + p.horas, 0),
      horasHoy: series.length ? series[series.length - 1].horas : 0,
      otsOpen: wip.filter((x) => x.estado === "OPEN").length,
      otsInProgress: wip.filter((x) => x.estado === "IN_PROGRESS").length,
      piezasPlan: totalPlan,
      piezasHechas: totalHecho,
      avanceGlobalPct:
        totalPlan > 0 ? Math.min(100, (totalHecho / totalPlan) * 100) : 0,
    };

    return { series, machines, operators, wip, kpis, from, until };
  },
  ["production:overview"],
  { tags: [cacheTags.workorders, cacheTags.worklogs("")], revalidate: 30 }
);

/** Para “registro rápido”: OTs en proceso con piezas pendientes */
export const getQuickLogData = cache(
  async () => {
    const ots = await prisma.ordenTrabajo.findMany({
      where: { estado: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { creadaEn: "desc" },
      select: {
        id: true,
        codigo: true,
        estado: true,
        piezas: {
          select: {
            id: true,
            productoId: true,
            descripcion: true,
            qtyPlan: true,
            qtyHecha: true,
          },
        },
      },
    });

    const items = ots.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      estado: o.estado,
      piezas: o.piezas
        .map((p) => ({
          id: p.id,
          titulo: p.descripcion || p.productoId || "—",
          pend: Math.max(0, Number(p.qtyPlan) - Number(p.qtyHecha)),
        }))
        .filter((p) => p.pend > 0),
    }));

    return { ots: items };
  },
  ["production:quicklog"],
  { tags: [cacheTags.workorders, cacheTags.worklogs("")], revalidate: 15 }
);
