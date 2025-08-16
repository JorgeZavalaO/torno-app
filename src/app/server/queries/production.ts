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

    // Partes (horas) - optimización con joins
    const partes = await prisma.parteProduccion.findMany({
      where: { fecha: { gte: from, lte: until } },
      select: {
        fecha: true,
        horas: true,
        maquina: true,
        usuario: { select: { displayName: true, email: true } },
      },
      orderBy: { fecha: 'asc' },
    });

    // Series por día con inicialización optimizada
    const mapByDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = fmtDay(addDays(from, i));
      mapByDay.set(d, 0);
    }
    
    // Procesar partes de una sola vez
    for (const p of partes) {
      const d = fmtDay(new Date(p.fecha));
      mapByDay.set(d, (mapByDay.get(d) || 0) + Number(p.horas));
    }
    
    const series: SeriePoint[] = Array.from(mapByDay.entries()).map(
      ([day, horas]) => ({ day: day.slice(-5), horas }) // Solo mostrar MM-DD
    );

    // Top máquinas con filtrado de datos vacíos
    const machineMap = new Map<string, number>();
    for (const p of partes) {
      const key = (p.maquina || "Sin especificar").trim() || "Sin especificar";
      machineMap.set(key, (machineMap.get(key) || 0) + Number(p.horas));
    }
    const machines: MachineRow[] = Array.from(machineMap.entries())
      .map(([maquina, horas]) => ({ maquina, horas }))
      .filter(m => m.horas > 0) // Filtrar máquinas sin horas
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 15); // Aumentar límite para mejor visualización

    // Top operadores con nombres mejorados
    const opMap = new Map<string, number>();
    for (const p of partes) {
      const name = p.usuario?.displayName || 
                   p.usuario?.email?.split('@')[0] || // Usar parte antes del @
                   "Operador desconocido";
      opMap.set(name, (opMap.get(name) || 0) + Number(p.horas));
    }
    const operators: OperatorRow[] = Array.from(opMap.entries())
      .map(([usuario, horas]) => ({ usuario, horas }))
      .filter(o => o.horas > 0) // Filtrar operadores sin horas
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 15); // Aumentar límite

    // OTs (WIP y avance) con mejor cálculo de fechas
    const ots = await prisma.ordenTrabajo.findMany({
      where: { 
        estado: { in: ["OPEN", "IN_PROGRESS"] },
        // Opcional: filtrar por fecha de creación reciente
        // creadaEn: { gte: addDays(until, -90) } 
      },
      orderBy: [
        { prioridad: 'desc' }, // Primero por prioridad
        { creadaEn: 'desc' }   // Luego por fecha
      ],
      include: {
        piezas: { 
          select: { qtyPlan: true, qtyHecha: true },
          where: { 
            OR: [
              { qtyPlan: { gt: 0 } },
              { qtyHecha: { gt: 0 } }
            ]
          }
        },
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
        avancePct: Math.round(pct * 10) / 10, // Redondeo a 1 decimal
        creadaEn: o.creadaEn,
      };
    }).filter(w => w.piezasPlan > 0); // Solo OTs con piezas planeadas

    const totalPlan = wip.reduce((s, x) => s + x.piezasPlan, 0);
    const totalHecho = wip.reduce((s, x) => s + x.piezasHechas, 0);

    // KPIs mejorados
    const last7Days = series.slice(-7);
    const kpis = {
      horasUlt7d: Math.round(last7Days.reduce((s, p) => s + p.horas, 0) * 100) / 100,
      horasHoy: Math.round((series.length ? series[series.length - 1].horas : 0) * 100) / 100,
      otsOpen: wip.filter((x) => x.estado === "OPEN").length,
      otsInProgress: wip.filter((x) => x.estado === "IN_PROGRESS").length,
      piezasPlan: totalPlan,
      piezasHechas: totalHecho,
      avanceGlobalPct: totalPlan > 0 ? Math.round(((totalHecho / totalPlan) * 100) * 10) / 10 : 0,
    };

    return { series, machines, operators, wip, kpis, from, until };
  },
  ["production:overview"],
  { tags: [cacheTags.workorders, cacheTags.worklogs("")], revalidate: 30 }
);

/** Para “registro rápido”: OTs en proceso con piezas pendientes */
export const getQuickLogData = cache(
  async () => {
    // OTs elegibles (OPEN + IN_PROGRESS) para horas y piezas (UI restringe piezas a IN_PROGRESS)
    const ots = await prisma.ordenTrabajo.findMany({
      where: { estado: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { creadaEn: "desc" },
      select: {
        id: true, codigo: true, estado: true,
        piezas: {
          select: { id: true, productoId: true, descripcion: true, qtyPlan: true, qtyHecha: true },
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

    // Operadores (catálogo)
    const usuarios = await prisma.userProfile.findMany({
      select: { id: true, displayName: true, email: true },
      orderBy: { displayName: "asc" },
    });
    const operadores = usuarios.map(u => ({
      id: u.id,
      nombre: u.displayName || (u.email?.split("@")[0] ?? "Operador"),
      email: u.email ?? null,
    }));

    // Máquinas (catálogo del módulo de máquinas)
    const maquinasRaw = await prisma.maquina.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
    const maquinas = maquinasRaw.map(m => ({ id: m.id, nombre: m.nombre }));

    return { ots: items, operadores, maquinas };
  },
  ["production:quicklog"],
  { tags: [cacheTags.workorders, cacheTags.worklogs("")], revalidate: 15 }
);
