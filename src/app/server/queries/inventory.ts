import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

// Util simple
const toNum = (v: unknown) => (v == null ? 0 : Number((v as { toString?(): string })?.toString?.() ?? v));

/**
 * Lista de productos con stock calculado y último costo de ingreso.
 * Optimiza: 2 queries y composición en memoria.
 */
export const getProductsWithStock = cache(
  async () => {
    const [products, sums, lastInCost] = await Promise.all([
      prisma.producto.findMany({
        orderBy: { nombre: "asc" },
        select: { sku: true, nombre: true, categoria: true, uom: true, costo: true, stockMinimo: true, createdAt: true, updatedAt: true },
      }),
      prisma.movimiento.groupBy({
        by: ["productoId"],
        _sum: { cantidad: true },
      }),
      prisma.movimiento.findMany({
        where: { tipo: { in: ["INGRESO_COMPRA", "INGRESO_AJUSTE"] } },
        orderBy: { fecha: "desc" },
        select: { productoId: true, costoUnitario: true },
      }),
    ]);

    const stockMap = new Map(sums.map(s => [s.productoId, toNum(s._sum.cantidad)]));
    const lastCostMap = new Map<string, number>();
    for (const mov of lastInCost) {
      if (!lastCostMap.has(mov.productoId)) lastCostMap.set(mov.productoId, toNum(mov.costoUnitario));
    }

  return products.map(p => {
      const stock = stockMap.get(p.sku) ?? 0;
      const lastCost = lastCostMap.get(p.sku) ?? toNum(p.costo);
      return {
    sku: p.sku,
    nombre: p.nombre,
    categoria: p.categoria,
    uom: p.uom,
    costo: toNum(p.costo),
    stockMinimo: p.stockMinimo != null ? toNum(p.stockMinimo) : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
        stock,
        lastCost,
        stockValue: Number((stock * lastCost).toFixed(2)),
      };
    });
  },
  ["inventory:products:list"],
  { tags: [cacheTags.inventoryProducts], revalidate: 60 }
);

/** Últimos movimientos globales (para dashboard) */
export const getRecentMovements = cache(
  async (limit = 50) => {
    const rows = await prisma.movimiento.findMany({
      orderBy: { fecha: "desc" },
      take: limit,
      include: { producto: { select: { nombre: true, uom: true, categoria: true } } },
    });

    return rows.map(r => ({
      id: r.id,
      fecha: r.fecha,
      tipo: r.tipo,
      productoId: r.productoId,
      productoNombre: r.producto.nombre,
      categoria: r.producto.categoria,
      cantidad: toNum(r.cantidad),
      uom: r.producto.uom,
      costoUnitario: toNum(r.costoUnitario),
      importe: Number((toNum(r.cantidad) * toNum(r.costoUnitario)).toFixed(2)),
      nota: r.nota ?? undefined,
    }));
  },
  ["inventory:movs:recent"],
  { tags: [cacheTags.inventoryMovs], revalidate: 30 }
);

/** Detalle de producto con Kardex */
export async function getProductKardex(sku: string) {
  const [p, movs] = await Promise.all([
    prisma.producto.findUnique({ where: { sku } }),
    prisma.movimiento.findMany({
      where: { productoId: sku },
      orderBy: { fecha: "desc" },
    }),
  ]);
  if (!p) return null;
  const toNum = (v: unknown) => Number((v as { toString?(): string })?.toString?.() ?? v ?? 0);
  const stock = toNum(movs.reduce((acc, m) => acc + toNum(m.cantidad), 0));
  return {
    producto: {
      sku: p.sku, nombre: p.nombre, categoria: p.categoria, uom: p.uom,
      costo: toNum(p.costo), stockMinimo: p.stockMinimo ? toNum(p.stockMinimo) : null,
      createdAt: p.createdAt, updatedAt: p.updatedAt,
    },
    stock,
    movs: movs.map(m => ({
      id: m.id, fecha: m.fecha, tipo: m.tipo, cantidad: toNum(m.cantidad), costoUnitario: toNum(m.costoUnitario),
      refTabla: m.refTabla ?? undefined, refId: m.refId ?? undefined, nota: m.nota ?? undefined,
      importe: Number((toNum(m.cantidad) * toNum(m.costoUnitario)).toFixed(2)),
    })),
  };
}
