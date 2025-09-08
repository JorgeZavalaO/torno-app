import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";

/**
 * Consultas optimizadas de inventario con caché inteligente
 */

// Stock en tiempo real con memoización
const stockCache = new Map<string, { value: number; timestamp: number }>();
const STOCK_CACHE_TTL = 30000; // 30 segundos

export async function getProductStock(sku: string): Promise<number> {
  const cached = stockCache.get(sku);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < STOCK_CACHE_TTL) {
    return cached.value;
  }
  
  const result = await prisma.movimiento.aggregate({
    where: { productoId: sku },
    _sum: { cantidad: true },
  });
  
  const stock = Number(result._sum.cantidad || 0);
  stockCache.set(sku, { value: stock, timestamp: now });
  
  return stock;
}

/**
 * Productos con stock crítico (optimizada)
 */
export const getCriticalStockProducts = cache(
  async () => {
    const result = await prisma.$queryRaw<Array<{
      sku: string;
      nombre: string;
      stock: number;
      stockMinimo: number;
      categoria: string;
    }>>`
      SELECT 
        p.sku,
        p.nombre,
        COALESCE(m.stock, 0)::FLOAT as stock,
        p."stockMinimo"::FLOAT as "stockMinimo",
        p.categoria
      FROM "Producto" p
      LEFT JOIN (
        SELECT "productoId", SUM("cantidad") as stock
        FROM "Movimiento"
        GROUP BY "productoId"
      ) m ON p.sku = m."productoId"
      WHERE p."stockMinimo" IS NOT NULL 
      AND COALESCE(m.stock, 0) <= p."stockMinimo"
      ORDER BY (COALESCE(m.stock, 0) / NULLIF(p."stockMinimo", 0)) ASC
      LIMIT 50
    `;
    
    return result;
  },
  ['inventory:critical-stock'],
  { revalidate: 30, tags: ['inventory:stock'] }
);

/**
 * Resumen de producción optimizado para dashboard
 */
export const getProductionSummary = cache(
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [hoursToday, hours7d, activeOTs, urgentOTs] = await Promise.all([
      // Horas hoy
      prisma.parteProduccion.aggregate({
        where: { fecha: { gte: today } },
        _sum: { horas: true },
      }),
      
      // Horas últimos 7 días
      prisma.parteProduccion.aggregate({
        where: { fecha: { gte: sevenDaysAgo } },
        _sum: { horas: true },
      }),
      
      // OTs activas por estado
      prisma.ordenTrabajo.groupBy({
        by: ['estado'],
        where: { estado: { in: ['OPEN', 'IN_PROGRESS'] } },
        _count: { id: true },
      }),
      
      // OTs urgentes
      prisma.ordenTrabajo.count({
        where: {
          estado: { in: ['OPEN', 'IN_PROGRESS'] },
          prioridad: 'URGENT',
        },
      }),
    ]);
    
    const openCount = activeOTs.find(o => o.estado === 'OPEN')?._count.id || 0;
    const inProgressCount = activeOTs.find(o => o.estado === 'IN_PROGRESS')?._count.id || 0;
    
    return {
      hoursToday: Number(hoursToday._sum.horas || 0),
      hours7d: Number(hours7d._sum.horas || 0),
      otsOpen: openCount,
      otsInProgress: inProgressCount,
      otsUrgent: urgentOTs,
      totalActive: openCount + inProgressCount,
    };
  },
  ['production:summary'],
  { revalidate: 30, tags: ['production:overview'] }
);

/**
 * Top operadores por rendimiento (caché largo)
 */
export const getTopOperators = cache(
  async (days = 30) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const result = await prisma.$queryRaw<Array<{
      userId: string;
      displayName: string;
      email: string;
      totalHoras: number;
      avgHoras: number;
      registros: number;
    }>>`
      SELECT 
        pp."userId",
        u."displayName",
        u.email,
        SUM(pp.horas)::FLOAT as "totalHoras",
        AVG(pp.horas)::FLOAT as "avgHoras",
        COUNT(*)::INT as registros
      FROM "ParteProduccion" pp
      JOIN "UserProfile" u ON pp."userId" = u.id
      WHERE pp.fecha >= ${since}
      AND pp.horas > 0
      GROUP BY pp."userId", u."displayName", u.email
      HAVING SUM(pp.horas) > 0
      ORDER BY SUM(pp.horas) DESC
      LIMIT 20
    `;
    
    return result;
  },
  ['production:top-operators'],
  { revalidate: 300, tags: ['production:performance'] }
);

/**
 * Invalidar cachés relacionados con stock
 */
export function invalidateStockCaches(skus?: string[]) {
  if (skus) {
    skus.forEach(sku => stockCache.delete(sku));
  } else {
    stockCache.clear();
  }
}
