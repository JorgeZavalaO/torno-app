import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";

type MachineRow = {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  estado: "ACTIVA" | "MANTENIMIENTO" | "BAJA";
  ubicacion?: string | null;
  ultimoEvento?: { tipo: string; inicio: Date; fin?: Date | null } | null;
  horasUlt30d: number;
  pendMant: number;
  // Nuevas métricas solicitadas
  paradasPorFallas30d: number;
  averias30d: number;
  horasParaSigMant: number | null;
  costoMant30d: number;
};

export const getMachinesCached = cache(
  async (): Promise<MachineRow[]> => {
    const [maquinas, eventos30d, pendientes, fallas30d, averias30d, costos30d, proximosMantenimientos] = await Promise.all([
      prisma.maquina.findMany({ orderBy: { nombre: "asc" } }),
      prisma.maquinaEvento.groupBy({
        by: ["maquinaId"],
        where: { inicio: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
        _sum: { horas: true },
      }),
      prisma.maquinaMantenimiento.groupBy({
        by: ["maquinaId"],
        where: { estado: "PENDIENTE" },
        _count: { _all: true },
      }),
      // Paradas por fallas (PARO + AVERIA)
      prisma.maquinaEvento.groupBy({
        by: ["maquinaId"],
        where: { 
          inicio: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
          tipo: { in: ["PARO", "AVERIA"] }
        },
        _count: { _all: true },
      }),
      // Solo averías
      prisma.maquinaEvento.groupBy({
        by: ["maquinaId"],
        where: { 
          inicio: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
          tipo: "AVERIA"
        },
        _count: { _all: true },
      }),
      // Costos de mantenimiento últimos 30 días
      prisma.maquinaMantenimiento.groupBy({
        by: ["maquinaId"],
        where: { 
          fechaReal: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
          estado: "COMPLETADO"
        },
        _sum: { costo: true },
      }),
      // Próximos mantenimientos programados
      prisma.maquinaMantenimiento.findMany({
        where: { 
          estado: "PENDIENTE",
          fechaProg: { gte: new Date() }
        },
        orderBy: { fechaProg: "asc" },
      }),
    ]);

    // último evento por máquina (usa DISTINCT ON vía raw para eficiencia)
    const lastByMachine = await prisma.$queryRaw<{ maquinaId:string; tipo:string; inicio:Date; fin:Date|null }[]>`
      SELECT DISTINCT ON ("maquinaId") "maquinaId", "tipo", "inicio", "fin"
      FROM "MaquinaEvento"
      ORDER BY "maquinaId", "inicio" DESC
    `;

    const sumMap = new Map(eventos30d.map(e => [e.maquinaId, Number(e._sum.horas || 0)]));
    const pendMap = new Map(pendientes.map(p => [p.maquinaId, Number(p._count._all || 0)]));
    const fallasMap = new Map(fallas30d.map(f => [f.maquinaId, Number(f._count._all || 0)]));
    const averiasMap = new Map(averias30d.map(a => [a.maquinaId, Number(a._count._all || 0)]));
    const costosMap = new Map(costos30d.map(c => [c.maquinaId, Number(c._sum.costo || 0)]));
    const lastMap = new Map<string, MachineRow["ultimoEvento"]>();
    
    // Mapa de próximos mantenimientos por máquina
    const nextMaintMap = new Map<string, Date>();
    proximosMantenimientos.forEach(m => {
      if (!nextMaintMap.has(m.maquinaId)) {
        nextMaintMap.set(m.maquinaId, m.fechaProg);
      }
    });

    for (const e of lastByMachine) {
      if (!lastMap.has(e.maquinaId)) {
        lastMap.set(e.maquinaId, { tipo: e.tipo, inicio: e.inicio, fin: e.fin ?? undefined });
      }
    }

    // Función auxiliar para calcular horas hasta próximo mantenimiento
    const calcularHorasParaMant = (fechaMant: Date | undefined): number | null => {
      if (!fechaMant) return null;
      const diffMs = fechaMant.getTime() - Date.now();
      return diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60)) : 0;
    };

    return maquinas.map(m => ({
      id: m.id,
      codigo: m.codigo,
      nombre: m.nombre,
      categoria: m.categoria,
      estado: m.estado as MachineRow["estado"],
      ubicacion: m.ubicacion,
      horasUlt30d: Number(sumMap.get(m.id) ?? 0),
      pendMant: pendMap.get(m.id) ?? 0,
      ultimoEvento: lastMap.get(m.id) ?? null,
      // Nuevas métricas - convertir Decimal a number
      paradasPorFallas30d: fallasMap.get(m.id) ?? 0,
      averias30d: averiasMap.get(m.id) ?? 0,
      horasParaSigMant: calcularHorasParaMant(nextMaintMap.get(m.id)),
      costoMant30d: Number(costosMap.get(m.id) ?? 0),
    }));
  },
  ["machines:list"],
  { revalidate: 30 }
);

export const getMachineDetail = cache(
  async (id: string) => {
    const m = await prisma.maquina.findUnique({ where: { id } });
    if (!m) return null;

    const since30 = new Date(Date.now() - 30*24*3600*1000);
    const [eventos, mantenimientos, horasSerie, mountedTools, availableTools] = await Promise.all([
      prisma.maquinaEvento.findMany({
        where: { maquinaId: id, inicio: { gte: since30 } },
        orderBy: { inicio: "desc" },
        take: 500,
        include: { ot: { select: { codigo: true } }, usuario: { select: { displayName: true, email: true } } },
      }),
      prisma.maquinaMantenimiento.findMany({
        where: { maquinaId: id },
        orderBy: [{ estado: "asc" }, { fechaProg: "asc" }],
        take: 100,
      }),
      prisma.$queryRaw<{ day: string; horas: number }[]>`
        SELECT to_char(date_trunc('day', "inicio"), 'YYYY-MM-DD') as day,
               SUM(COALESCE("horas",0))::float as horas
        FROM "MaquinaEvento"
        WHERE "maquinaId" = ${id}
          AND "inicio" >= NOW() - INTERVAL '30 day'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      // Herramientas montadas
      prisma.toolInstance.findMany({
        where: { maquinaId: id, estado: "EN_USO" },
        include: { producto: { select: { nombre: true, sku: true, uom: true } } }
      }),
      // Herramientas disponibles para montar (NUEVA o AFILADO)
      prisma.toolInstance.findMany({
        where: { estado: { in: ["NUEVA", "AFILADO"] } },
        include: { producto: { select: { nombre: true } } },
        orderBy: { codigo: "asc" }
      })
    ]);

  const horasTot = eventos.reduce((s,e)=> s + Number(e.horas || 0), 0);
    const usoPctAprox = Math.min(100, (horasTot / (30*8)) * 100); // asumiendo 8h/día, 30 días

    // Nuevas métricas para el detalle
    const paradasPorFallas = eventos.filter(e => e.tipo === "PARO" || e.tipo === "AVERIA").length;
    const averias = eventos.filter(e => e.tipo === "AVERIA").length;
    const costoMantenimientos = mantenimientos
      .filter(m => m.estado === "COMPLETADO" && m.fechaReal && m.fechaReal >= since30)
      .reduce((sum, m) => sum + Number(m.costo || 0), 0);

    // Próximo mantenimiento programado
    const proximoMant = mantenimientos
      .filter(m => m.estado === "PENDIENTE" && m.fechaProg > new Date())
      .sort((a, b) => a.fechaProg.getTime() - b.fechaProg.getTime())[0];

    const horasParaSigMant = proximoMant 
      ? Math.round((proximoMant.fechaProg.getTime() - Date.now()) / (1000 * 60 * 60))
      : null;

    return {
      maquina: m,
      eventos: eventos.map(e => ({
        ...e,
        horas: Number(e.horas), // Convertir Decimal a number
      })),
      mantenimientos: mantenimientos.map(m => ({
        ...m,
        costo: Number(m.costo), // Convertir Decimal a number
      })),
      serie30d: horasSerie,
      mountedTools: mountedTools.map(t => ({
        ...t,
        vidaAcumulada: Number(t.vidaAcumulada),
        vidaUtilEstimada: t.vidaUtilEstimada ? Number(t.vidaUtilEstimada) : null
      })),
      availableTools: availableTools.map(t => ({
        id: t.id,
        codigo: t.codigo,
        producto: { nombre: t.producto.nombre }
      })),
      kpis: {
        horas30d: horasTot,
        usoPctAprox,
        pendMant: mantenimientos.filter(mm => mm.estado === "PENDIENTE").length,
        // Nuevas métricas
        paradasPorFallas30d: paradasPorFallas,
        averias30d: averias,
        horasParaSigMant,
        costoMant30d: costoMantenimientos,
      }
    };
  },
  // @ts-expect-error Next.js unstable_cache admite función de key dinámica
  (id: string) => ["machines:detail", id],
  { revalidate: 30 }
);

// OTs para loguear horas desde /maquinas
export const getOpenOTsMini = cache(
  async () => {
    const ots = await prisma.ordenTrabajo.findMany({
      where: { estado: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { creadaEn: "desc" },
      select: { id: true, codigo: true },
      take: 200,
    });
    return ots;
  },
  ["machines:mini-ots"],
  { revalidate: 30 }
);
