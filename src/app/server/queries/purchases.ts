import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

const toNum = (v: unknown) => (v == null ? 0 : Number((v as { toString?: () => string })?.toString?.() ?? v));

export const getProvidersCached = cache(
  async () =>
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, ruc: true, email: true, telefono: true, direccion: true },
    }),
  ["purchases:providers:list"],
  { tags: [cacheTags.providers], revalidate: 120 }
);

export const getSCsCached = cache(
  async () => {
    const rows = await prisma.solicitudCompra.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        solicitante: { select: { id: true, email: true, displayName: true } },
        items: { include: { producto: { select: { nombre: true, uom: true } } } },
        ordenesCompra: {
          select: { id: true, codigo: true, estado: true },
        },
      },
      take: 100,
    });

    // Cobertura por SCItem (suma de OCItem.cantidad)
    const allScItemIds = rows.flatMap(r => r.items.map(i => i.id));
    const ocLinks = await prisma.oCItem.groupBy({
      by: ["scItemId"],
      _sum: { cantidad: true },
      where: { scItemId: { in: allScItemIds } },
    });
    const sumByScItem = new Map(ocLinks.map(x => [x.scItemId!, Number(x._sum.cantidad || 0)]));

    return rows.map(r => {
      const items = r.items.map(i => {
        const pedido = Number(i.cantidad);
        const cubierto = Number(sumByScItem.get(i.id) || 0);
        const pendiente = Math.max(0, Number((pedido - cubierto).toFixed(3)));
        return {
          id: i.id,
          productoId: i.productoId,
          nombre: i.producto.nombre,
          uom: i.producto.uom,
          cantidad: pedido,
          costoEstimado: i.costoEstimado != null ? Number(i.costoEstimado) : null,
          cubierto,
          pendiente,
        };
      });
      const orderedTotal = items.reduce((a, it) => a + it.cubierto, 0);
      const qtyTotal     = items.reduce((a, it) => a + it.cantidad, 0);
      const pendingTotal = Math.max(0, Number((qtyTotal - orderedTotal).toFixed(3)));

      return {
        id: r.id,
        estado: r.estado,
        createdAt: r.createdAt,
        solicitante: r.solicitante,
        totalEstimado: Number(r.totalEstimado ?? 0),
        notas: r.notas ?? undefined,
        items,
        // 🔄 ahora lista:
        ocs: r.ordenesCompra,
        orderedTotal,
        pendingTotal,
      };
    });
  },
  ["purchases:sc:list"],
  { tags: [cacheTags.purchasesSC], revalidate: 60 }
);

export const getOCsCached = cache(
  async () => {
    const rows = await prisma.ordenCompra.findMany({
      orderBy: { fecha: "desc" },
      include: {
        proveedor: true,
        items: { include: { producto: { select: { nombre: true, uom: true } } } },
        solicitudCompra: { select: { id: true } },
        // movimientos para calcular pendientes
        _count: true,
      },
      take: 100,
    });
    // Obtener movimientos por OC (refTabla/refId) para calcular recibido
    const codigos = rows.map(r => r.codigo);
    const movs = await prisma.movimiento.findMany({
      where: { refTabla: "OC", refId: { in: codigos } },
      select: { refId: true, productoId: true, cantidad: true },
    });
    const movMap = movs.reduce<Record<string, Record<string, number>>>((acc, m) => {
      const ocCode = m.refId || "";
      acc[ocCode] = acc[ocCode] || {};
      acc[ocCode][m.productoId] = (acc[ocCode][m.productoId] ?? 0) + toNum(m.cantidad);
      return acc;
    }, {});
    return rows.map(r => ({
      id: r.id,
      codigo: r.codigo,
      estado: r.estado,
      fecha: r.fecha,
      total: toNum(r.total),
      proveedor: { id: r.proveedor.id, nombre: r.proveedor.nombre, ruc: r.proveedor.ruc },
      scId: r.solicitudCompra.id,
      items: r.items.map(i => {
        const recibido = toNum(movMap[r.codigo]?.[i.productoId] ?? 0);
        const pedido = toNum(i.cantidad);
        const pendiente = Math.max(0, Number((pedido - recibido).toFixed(3)));
        return {
          id: i.id,
          productoId: i.productoId,
          nombre: i.producto.nombre,
          uom: i.producto.uom,
            cantidad: pedido,
          costoUnitario: toNum(i.costoUnitario),
          importe: Number((pedido * toNum(i.costoUnitario)).toFixed(2)),
          pendiente,
        };
      }),
      pendienteTotal: r.items.reduce((acc, i) => {
        const recibido = toNum(movMap[r.codigo]?.[i.productoId] ?? 0);
        const pedido = toNum(i.cantidad);
        return acc + Math.max(0, pedido - recibido);
      }, 0),
    }));
  },
  ["purchases:oc:list"],
  { tags: [cacheTags.purchasesOC], revalidate: 60 }
);
