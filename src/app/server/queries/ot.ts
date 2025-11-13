import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";

// NOTE: OTClient expects a richer row with `materiales`, `clienteId`/`clienteNombre` and `hasShortage`.
// Provide a cached list that includes material summaries so the client can render the table without
// requesting each detail individually.
export type OTListRow = {
  id: string;
  codigo: string;
  estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED";
  prioridad: "LOW"|"MEDIUM"|"HIGH"|"URGENT";
  clienteId: string | null;
  clienteNombre: string | null;
  creadaEn: Date;
  fechaLimite?: Date | null;
  notas?: string;
  acabado?: string;
  materiales: {
    id: string;
    productoId: string;
    nombre: string;
    uom: string;
    qtyPlan: number;
    qtyEmit: number;
    qtyPend: number;
    stock: number;
    faltante: number;
  }[];
  hasShortage: boolean;
  progresoMateriales: number; // 0..1
  progresoPiezas: number;     // 0..1
  piezasPend?: number;
};

export const getOTListCached = cache(
  async (): Promise<OTListRow[]> => {
  const ots = await prisma.ordenTrabajo.findMany({
      orderBy: { creadaEn: "desc" },
      include: {
        cliente: { select: { id: true, nombre: true } },
        materiales: { include: { producto: { select: { nombre: true, uom: true } } } },
        piezas: true,
      },
      take: 500,
    });

  return ots.map(o => {
      // compute materials summary
      const mats = (o.materiales || []).map(m => {
        const qtyPlan = Number(m.qtyPlan || 0);
        const qtyEmit = Number(m.qtyEmit || 0);
        const faltante = Math.max(0, qtyPlan - qtyEmit);
        return {
          id: m.id,
          productoId: m.productoId,
          nombre: m.producto?.nombre || m.productoId,
          uom: m.producto?.uom || "u",
          qtyPlan,
          qtyEmit,
          qtyPend: Math.max(0, qtyPlan - qtyEmit),
          stock: 0,
          faltante,
        };
      });

      const planM = mats.reduce((s, m) => s + (m.qtyPlan || 0), 0);
      const emitM = mats.reduce((s, m) => s + (m.qtyEmit || 0), 0);
      const progMat = planM > 0 ? emitM / planM : 0;

      const piezasList = o.piezas || [];
      const planP = piezasList.reduce((s, p) => s + Number(p.qtyPlan || 0), 0);
      const hechaP = piezasList.reduce((s, p) => s + Math.min(Number(p.qtyHecha || 0), Number(p.qtyPlan || 0)), 0);
      const progPz = planP > 0 ? hechaP / planP : 0;

  const hasShortage = mats.some(m => m.faltante > 0);

      return {
        id: o.id,
        codigo: o.codigo,
        estado: o.estado as OTListRow["estado"],
        prioridad: o.prioridad as OTListRow["prioridad"],
        clienteId: o.cliente?.id ?? null,
        clienteNombre: o.cliente?.nombre ?? null,
  creadaEn: o.creadaEn,
  fechaLimite: (o as { fechaLimite?: Date | null }).fechaLimite ?? null,
        notas: ((o as { notas?: string | null }).notas ?? undefined) || undefined,
        acabado: ((o as { acabado?: string | null }).acabado ?? undefined) || undefined,
        materiales: mats,
        hasShortage,
        progresoMateriales: Number(progMat),
  progresoPiezas: Number(progPz),
  piezasPend: Math.max(0, planP - hechaP),
      };
    });
  },
  ["ot:list"],
  { revalidate: 20 }
);

export const getOTDetail = cache(
  async (id: string) => {
  const raw = await prisma.ordenTrabajo.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true } },
        materiales: { include: { producto: { select: { nombre: true, uom: true } } } },
        piezas: true,
        partesProduccion: {
          orderBy: { fecha: "desc" },
          take: 200,
          include: {
            usuario: { select: { displayName: true, email: true } },
            pieza:   { select: { descripcion: true, productoId: true } },
          },
        },
        // (si no lo usas en la UI, evita cargar solicitudesCompra para no sobrecargar)
      },
    });
    if (!raw) return null;

    const N = (v: unknown) => Number(v ?? 0);

    // Normaliza materiales (Decimal -> number)
    const materiales = raw.materiales.map(m => ({
      id: m.id,
      productoId: m.productoId,
      producto: m.producto ? { nombre: m.producto.nombre, uom: m.producto.uom ?? "" } : null,
      qtyPlan: N(m.qtyPlan),
      qtyEmit: N(m.qtyEmit),
    }));

    // Normaliza piezas (Decimal -> number)
    const piezas = raw.piezas.map(p => ({
      id: p.id,
      productoId: p.productoId ?? null,
      descripcion: p.descripcion ?? null,
      qtyPlan: N(p.qtyPlan),
      qtyHecha: N(p.qtyHecha),
    }));

    // Normaliza partes (Decimal/Date -> number/string)
    const partesProduccion = raw.partesProduccion.map(pp => ({
      id: pp.id,
      fecha: pp.fecha.toISOString(),
      horas: N(pp.horas),
      maquina: pp.maquina ?? null,
      nota: pp.nota ?? null,
      usuario: { displayName: pp.usuario?.displayName ?? null, email: pp.usuario?.email ?? null },
      pieza: { descripcion: pp.pieza?.descripcion ?? null, productoId: pp.pieza?.productoId ?? null },
    }));

    // KPIs (con números ya normalizados)
    let planM = 0, emitM = 0;
    for (const m of materiales) {
      if (m.qtyPlan > 0) { planM += m.qtyPlan; emitM += Math.min(m.qtyEmit, m.qtyPlan); }
    }
    let planP = 0, hechaP = 0;
    for (const p of piezas) {
      planP += p.qtyPlan;
      hechaP += Math.min(p.qtyHecha, p.qtyPlan);
    }

    const kpis = {
      progresoMateriales: planM > 0 ? emitM / planM : 0,
      progresoPiezas:     planP > 0 ? hechaP / planP : 0,
      piezasPend:         planP - hechaP,
      matsPend:           planM - emitM,
    };

    // Normaliza costos calculados (Decimal -> number)
    const costos = {
      costMaterials: N(raw.costMaterials),
      costLabor: N(raw.costLabor),
      costOverheads: N(raw.costOverheads),
      costTotal: N(raw.costTotal),
      costParams: raw.costParams as Record<string, unknown> | null,
      // Costos de cotización (snapshot inicial)
      costQuoteMaterials: N(raw.costQuoteMaterials),
      costQuoteLabor: N(raw.costQuoteLabor),
      costQuoteOverheads: N(raw.costQuoteOverheads),
      costQuoteTotal: N(raw.costQuoteTotal),
    };

    // Objeto plano y serializable
    const ot = {
      id: raw.id,
      codigo: raw.codigo,
      estado: raw.estado as "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED",
      prioridad: raw.prioridad as "LOW"|"MEDIUM"|"HIGH"|"URGENT",
      clienteId: raw.cliente?.id ?? null,
      cliente: raw.cliente ? { id: raw.cliente.id, nombre: raw.cliente.nombre } : null,
  fechaLimite: (raw as { fechaLimite?: Date | null }).fechaLimite ?? null,
      notas: raw.notas ?? null,
      acabado: raw.acabado ?? null,
      materiales,
      piezas,
      partesProduccion,
      ...costos, // Incluye todos los campos de costo
    };

    return { ot, kpis };
  },
  ["ot:detail"],
  { revalidate: 15 }
);

export const getProductsMini = cache(
  async () => {
    const rows = await prisma.producto.findMany({
      select: { sku: true, nombre: true, uom: true, categoria: true },
      orderBy: { nombre: "asc" },
      take: 2000,
    });
    
    // Obtener stock disponible por SKU
    const stocks = await prisma.movimiento.groupBy({
      by: ["productoId"],
      where: { productoId: { in: rows.map(r => r.sku) } },
      _sum: { cantidad: true },
    });
    
    const stockMap = new Map(
      stocks.map(s => [s.productoId, Number(s._sum.cantidad || 0)])
    );
    
    return rows.map(r => ({
      ...r,
      stock: stockMap.get(r.sku) ?? 0,
    }));
  },
  ["ot:products:mini"],
  { revalidate: 60 }
);

export const getClientsMini = cache(
  async () => {
    const rows = await prisma.cliente.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
      take: 2000,
    });
    return rows;
  },
  ["ot:clients:mini"],
  { revalidate: 60 }
);

// Paginación server-side mínima con filtros básicos
export async function getOTListPaged(opts: {
  page?: number;
  pageSize?: number;
  q?: string;
  prioridad?: string | null;
  clienteId?: string | null;
  sortBy?: 'fecha' | 'prioridad';
  sortDir?: 'asc' | 'desc';
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(200, opts.pageSize ?? 10));
  const skip = (page - 1) * pageSize;
  const q = (opts.q || '').trim();

  // Construir where básico
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  if (q) {
    and.push({
      OR: [
        { codigo: { contains: q, mode: 'insensitive' } },
        { cliente: { nombre: { contains: q, mode: 'insensitive' } } },
        { materiales: { some: { productoId: { contains: q, mode: 'insensitive' } } } },
      ],
    });
  }
  if (opts.prioridad && opts.prioridad !== 'ALL') {
    and.push({ prioridad: opts.prioridad });
  }
  if (opts.clienteId) {
    and.push({ clienteId: opts.clienteId });
  }
  if (and.length) where.AND = and;

  const orderBy: Record<string, unknown> = {};
  if (opts.sortBy === 'prioridad') {
    // order by prioridad then creadaEn
    orderBy.prioridad = opts.sortDir ?? 'asc';
  } else {
    orderBy.creadaEn = opts.sortDir ?? 'desc';
  }

  const [ots, total] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true } },
        materiales: { include: { producto: { select: { nombre: true, uom: true } } } },
        piezas: true,
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.ordenTrabajo.count({ where }),
  ]);

  const rows: OTListRow[] = ots.map(o => {
    const mats = (o.materiales || []).map(m => {
      const qtyPlan = Number(m.qtyPlan || 0);
      const qtyEmit = Number(m.qtyEmit || 0);
      const faltante = Math.max(0, qtyPlan - qtyEmit);
      return {
        id: m.id,
        productoId: m.productoId,
        nombre: m.producto?.nombre || m.productoId,
        uom: m.producto?.uom || 'u',
        qtyPlan,
        qtyEmit,
        qtyPend: Math.max(0, qtyPlan - qtyEmit),
        stock: 0,
        faltante,
      };
    });

    const piezasList = o.piezas || [];
    const planP = piezasList.reduce((s, p) => s + Number(p.qtyPlan || 0), 0);
    const hechaP = piezasList.reduce((s, p) => s + Math.min(Number(p.qtyHecha || 0), Number(p.qtyPlan || 0)), 0);
    const progPz = planP > 0 ? hechaP / planP : 0;

    const planM = mats.reduce((s, m) => s + (m.qtyPlan || 0), 0);
    const emitM = mats.reduce((s, m) => s + (m.qtyEmit || 0), 0);
    const progMat = planM > 0 ? emitM / planM : 0;

    const hasShortage = mats.some(m => m.faltante > 0);

    return {
      id: o.id,
      codigo: o.codigo,
      estado: o.estado as OTListRow['estado'],
      prioridad: o.prioridad as OTListRow['prioridad'],
      clienteId: o.cliente?.id ?? null,
      clienteNombre: o.cliente?.nombre ?? null,
      creadaEn: o.creadaEn,
      fechaLimite: (o as { fechaLimite?: Date | null }).fechaLimite ?? null,
      notas: ((o as { notas?: string | null }).notas ?? undefined) || undefined,
      acabado: ((o as { acabado?: string | null }).acabado ?? undefined) || undefined,
      materiales: mats,
      hasShortage,
      progresoMateriales: Number(progMat),
      progresoPiezas: Number(progPz),
      piezasPend: Math.max(0, planP - hechaP),
    };
  });

  return { rows, total };
}