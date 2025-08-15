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
  notas?: string;
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
  notas: ((o as { notas?: string | null }).notas ?? undefined) || undefined,
        materiales: mats,
        hasShortage,
        progresoMateriales: Number(progMat),
        progresoPiezas: Number(progPz),
      };
    });
  },
  ["ot:list"],
  { revalidate: 20 }
);

export const getOTDetail = cache(
  async (id: string) => {
    const ot = await prisma.ordenTrabajo.findUnique({
      where: { id },
      include: {
        cliente: true,
        materiales: { include: { producto: true } },
        piezas: true,
        partesProduccion: { // solo informativo; no se registran horas desde OT
          orderBy: { fecha: "desc" },
          take: 200,
          include: { usuario: { select: { displayName: true, email: true } }, pieza: { select: { descripcion: true, productoId: true } } },
        },
        solicitudesCompra: {
          orderBy: { createdAt: "desc" },
          include: { items: { include: { producto: true } } },
        },
      },
    });
    if (!ot) return null;

    // KPIs de avance
    const mats = ot.materiales;
    const piezas = ot.piezas;

    let planM = 0, emitM = 0;
    for (const m of mats) {
      const p = Number(m.qtyPlan || 0);
      const e = Number(m.qtyEmit || 0);
      if (p > 0) { planM += p; emitM += Math.min(e, p); }
    }
    const progMat = planM > 0 ? emitM / planM : 0;

    let planP = 0, hechaP = 0;
    for (const p of piezas) {
      planP += Number(p.qtyPlan || 0);
      hechaP += Math.min(Number(p.qtyHecha || 0), Number(p.qtyPlan || 0));
    }
    const progPz = planP > 0 ? hechaP / planP : 0;

    return {
      ot,
      kpis: {
        progresoMateriales: Number(progMat),
        progresoPiezas: Number(progPz),
        piezasPend: Number(planP - hechaP),
        matsPend: Number(planM - emitM),
      },
    };
  },
  ["ot:detail"],
  { revalidate: 15 }
);
export const getProductsMini = cache(
  async () => {
    const rows = await prisma.producto.findMany({
      select: { sku: true, nombre: true, uom: true },
      orderBy: { nombre: "asc" },
      take: 2000,
    });
    return rows;
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