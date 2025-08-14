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
};

export const getMachinesCached = cache(
  async (): Promise<MachineRow[]> => {
    const [maquinas, eventos30d, pendientes] = await Promise.all([
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
    ]);

    // último evento por máquina (usa DISTINCT ON vía raw para eficiencia)
    const lastByMachine = await prisma.$queryRaw<{ maquinaId:string; tipo:string; inicio:Date; fin:Date|null }[]>`
      SELECT DISTINCT ON ("maquinaId") "maquinaId", "tipo", "inicio", "fin"
      FROM "MaquinaEvento"
      ORDER BY "maquinaId", "inicio" DESC
    `;

    const sumMap = new Map(eventos30d.map(e => [e.maquinaId, Number(e._sum.horas || 0)]));
    const pendMap = new Map(pendientes.map(p => [p.maquinaId, Number(p._count._all || 0)]));
    const lastMap = new Map<string, MachineRow["ultimoEvento"]>();
    for (const e of lastByMachine) {
      if (!lastMap.has(e.maquinaId)) {
        lastMap.set(e.maquinaId, { tipo: e.tipo, inicio: e.inicio, fin: e.fin ?? undefined });
      }
    }

    return maquinas.map(m => ({
      id: m.id,
      codigo: m.codigo,
      nombre: m.nombre,
      categoria: m.categoria,
      estado: m.estado as MachineRow["estado"],
      ubicacion: m.ubicacion,
      horasUlt30d: sumMap.get(m.id) ?? 0,
      pendMant: pendMap.get(m.id) ?? 0,
      ultimoEvento: lastMap.get(m.id) ?? null,
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
    const [eventos, mantenimientos, horasSerie] = await Promise.all([
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
    ]);

  const horasTot = eventos.reduce((s,e)=> s + Number(e.horas || 0), 0);
    const usoPctAprox = Math.min(100, (horasTot / (30*8)) * 100); // asumiendo 8h/día, 30 días

    return {
      maquina: m,
      eventos,
      mantenimientos,
      serie30d: horasSerie,
      kpis: {
        horas30d: horasTot,
        usoPctAprox,
        pendMant: mantenimientos.filter(mm => mm.estado === "PENDIENTE").length,
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
