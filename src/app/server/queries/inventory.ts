import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

// Util simple
const toNum = (v: unknown) => (v == null ? 0 : Number((v as { toString?(): string })?.toString?.() ?? v));

/**
 * Lista de productos con stock calculado y último costo de ingreso.
 * Optimiza: 2 queries y composición en memoria.
 * Incluye búsqueda por códigos equivalentes.
 */
export const getProductsWithStock = cache(
  async (searchTerm?: string) => {
    let equivalentProductIds: string[] = [];

    // Si hay término de búsqueda, buscar en códigos equivalentes también
    if (searchTerm?.trim()) {
      try {
        const searchLower = searchTerm.toLowerCase().trim();
        const equivalentMatches = await prisma.$queryRaw<{ productoId: string }[]>`
          SELECT DISTINCT "productoId" 
          FROM "ProductoCodigoEquivalente"
          WHERE LOWER("sistema") LIKE ${`%${searchLower}%`} 
             OR LOWER("codigo") LIKE ${`%${searchLower}%`}
             OR LOWER("descripcion") LIKE ${`%${searchLower}%`}
        `;
        equivalentProductIds = equivalentMatches.map(m => m.productoId);
      } catch (e) {
        // Si la tabla no existe, ignorar
        console.warn('Error buscando en códigos equivalentes:', e);
      }
    }

    // Construir filtros para la búsqueda
    let productWhere = undefined;
    if (searchTerm?.trim()) {
      productWhere = {
        OR: [
          { nombre: { contains: searchTerm, mode: 'insensitive' as const } },
          { sku: { contains: searchTerm, mode: 'insensitive' as const } },
          // Incluir productos encontrados por códigos equivalentes
          ...(equivalentProductIds.length > 0 ? [{ sku: { in: equivalentProductIds } }] : [])
        ]
      };
    }
    
    const [products, sums, lastInCost] = await Promise.all([
      prisma.producto.findMany({
        where: productWhere,
        orderBy: { nombre: "asc" },
        select: { sku: true, nombre: true, categoria: true, uom: true, costo: true, stockMinimo: true, createdAt: true, updatedAt: true },
      }),
      prisma.movimiento.groupBy({
        by: ["productoId"],
        _sum: { cantidad: true },
      }),
      // Obtener el último costo de ingreso por producto con DISTINCT ON, evitando leer toda la tabla
      prisma.$queryRaw<{ productoId: string; costoUnitario: number }[]>`
        SELECT DISTINCT ON ("productoId") "productoId", "costoUnitario"
        FROM "Movimiento"
        WHERE "tipo" IN ('INGRESO_COMPRA','INGRESO_AJUSTE')
        ORDER BY "productoId", "fecha" DESC
      `,
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
  let eqCodes: { id: string; sistema: string; codigo: string; descripcion: string | null }[] = [];
  try {
    eqCodes = await prisma.$queryRaw<{ id: string; sistema: string; codigo: string; descripcion: string | null }[]>`
      SELECT id, sistema, codigo, descripcion
      FROM "ProductoCodigoEquivalente"
      WHERE "productoId" = ${sku}
      ORDER BY sistema ASC, codigo ASC
    `;
  } catch (e) {
    // Si la tabla no existe aún (42P01), retornar vacío sin romper la página
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('42P01')) {
      eqCodes = [];
    } else {
      throw e;
    }
  }
  if (!p) return null;
  const toNum = (v: unknown) => Number((v as { toString?(): string })?.toString?.() ?? v ?? 0);
  const stock = movs.reduce<number>((acc, m) => acc + toNum(m.cantidad), 0);
  return {
    producto: {
      sku: p.sku, nombre: p.nombre, categoria: p.categoria, uom: p.uom,
      costo: toNum(p.costo), stockMinimo: p.stockMinimo ? toNum(p.stockMinimo) : null,
      createdAt: p.createdAt, updatedAt: p.updatedAt,
    },
    equivalentes: eqCodes,
    stock,
    movs: movs.map(m => ({
      id: m.id, fecha: m.fecha, tipo: m.tipo, cantidad: toNum(m.cantidad), costoUnitario: toNum(m.costoUnitario),
      refTabla: m.refTabla ?? undefined, refId: m.refId ?? undefined, nota: m.nota ?? undefined,
      importe: Number((toNum(m.cantidad) * toNum(m.costoUnitario)).toFixed(2)),
    })),
  };
}
