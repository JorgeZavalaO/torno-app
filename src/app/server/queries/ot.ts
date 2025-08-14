import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

const toNum = (v: unknown) =>
  v == null
    ? 0
    : Number(
        typeof v === "object" && v
          ? (v as { toString: () => string }).toString()
          : v
      );

export const getOTsCached = cache(
  async () => {
    const ots = await prisma.ordenTrabajo.findMany({
      orderBy: { creadaEn: "desc" },
      include: {
        materiales: {
          include: { producto: { select: { nombre: true, uom: true } } },
        },
        cliente: { select: { id: true, nombre: true } },
      },
      take: 100,
    });

    const skus = Array.from(
      new Set(ots.flatMap((o) => o.materiales.map((m) => m.productoId)))
    );
    const sums = skus.length
      ? await prisma.movimiento.groupBy({
          by: ["productoId"],
          where: { productoId: { in: skus } },
          _sum: { cantidad: true },
        })
      : [];
    const stockMap = new Map(sums.map((s) => [s.productoId, toNum(s._sum.cantidad)]));

    return ots.map((o) => {
      const materiales = o.materiales.map((m) => {
        const plan = toNum(m.qtyPlan);
        const emit = toNum(m.qtyEmit);
        const pend = Math.max(0, plan - emit);
        const stock = stockMap.get(m.productoId) ?? 0;
        const faltante = Math.max(0, pend - stock);
        return {
          id: m.id,
          productoId: m.productoId,
          nombre: m.producto.nombre,
          uom: m.producto.uom,
          qtyPlan: plan,
          qtyEmit: emit,
          qtyPend: pend,
          stock,
          faltante,
        };
      });
      const hasShortage = materiales.some((x) => x.faltante > 0);
      return {
        id: o.id,
        codigo: o.codigo,
        estado: o.estado,
        prioridad: o.prioridad,
        creadaEn: o.creadaEn,
        clienteId: o.cliente?.id ?? null,
        clienteNombre: o.cliente?.nombre ?? null,
        notas: o.notas ?? undefined,
        materiales,
        hasShortage,
      };
    });
  },
  ["workorders:list"],
  { tags: [cacheTags.workorders], revalidate: 30 }
);

export async function getOTDetailFull(id: string) {
  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      materiales: {
        include: { producto: { select: { nombre: true, uom: true } } },
      },
      piezas: { include: { producto: { select: { nombre: true } } } },
      cliente: { select: { nombre: true } },
    },
  });
  if (!ot) return null;

  // Kardex de la OT
  const kardex = await prisma.movimiento.findMany({
    where: { refTabla: "OT", refId: ot.codigo },
    orderBy: { fecha: "desc" },
    include: { producto: { select: { nombre: true, uom: true } } },
  });

  const partes = await prisma.parteProduccion.findMany({
    where: { otId: id },
    orderBy: { fecha: "desc" },
    include: { usuario: { select: { email: true, displayName: true } } },
  });

  // Stock actual para materiales del detalle
  const matSkus = ot.materiales.map((m) => m.productoId);
  const stockSums = matSkus.length
    ? await prisma.movimiento.groupBy({
        by: ["productoId"],
        where: { productoId: { in: matSkus } },
        _sum: { cantidad: true },
      })
    : [];
  const stockMap = new Map(
    stockSums.map((s) => [s.productoId, Number(s._sum.cantidad || 0)])
  );

  return {
    id: ot.id,
    codigo: ot.codigo,
    estado: ot.estado,
    prioridad: ot.prioridad,
    creadaEn: ot.creadaEn,
    acabado: ot.acabado ?? undefined,
    clienteNombre: ot.cliente?.nombre ?? null,
    notas: ot.notas ?? undefined,
    materiales: ot.materiales.map((m) => {
      const plan = Number(m.qtyPlan);
      const emit = Number(m.qtyEmit);
      const pend = Math.max(0, plan - emit);
      const stock = stockMap.get(m.productoId) ?? 0;
      const faltante = Math.max(0, pend - stock);
      return {
        id: m.id,
        productoId: m.productoId,
        nombre: m.producto.nombre,
        uom: m.producto.uom,
        qtyPlan: plan,
        qtyEmit: emit,
        qtyPend: pend,
        stock,
        faltante,
      };
    }),
    piezas: ot.piezas.map((p) => ({
      id: p.id,
      productoId: p.productoId ?? undefined,
      descripcion: p.descripcion ?? p.producto?.nombre ?? undefined,
      qtyPlan: Number(p.qtyPlan),
      qtyHecha: Number(p.qtyHecha),
    })),
    kardex: kardex.map((k) => ({
      id: k.id,
      fecha: k.fecha,
      sku: k.productoId,
      nombre: k.producto.nombre,
      uom: k.producto.uom,
      tipo: k.tipo,
      cantidad: Number(k.cantidad),
      costoUnitario: Number(k.costoUnitario),
      importe: Number((Number(k.cantidad) * Number(k.costoUnitario)).toFixed(2)),
      nota: k.nota ?? undefined,
    })),
    partes: partes.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      horas: Number(p.horas),
      maquina: p.maquina ?? undefined,
      nota: p.nota ?? undefined,
      usuario: p.usuario.displayName ?? p.usuario.email,
    })),
  };
}
