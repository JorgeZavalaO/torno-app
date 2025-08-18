import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";
import { addDays, startOfDay } from "date-fns";

const toNum = (v: unknown) => (v == null ? 0 : Number((v as { toString?(): string })?.toString?.() ?? v));

export type DashboardKPIs = {
  // Producción
  production: {
    otOpen: number;
    otInProgress: number;
    otUrgent: number;
    horasUlt7d: number;
    horasHoy: number;
    avanceGeneral: number;
  };
  
  // Cotizaciones
  quotes: {
    totalDrafts: number;
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    valorTotalApproved: number;
  };
  
  // Inventario
  inventory: {
    totalProductos: number;
    productosStockBajo: number;
    valorInventario: number;
    movimientosRecientes: number;
  };
  
  // Compras
  purchases: {
    scPendientes: number;
    ocAbiertas: number;
    valorComprasUlt30d: number;
  };
  
  // Alertas y tendencias
  alerts: Array<{
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    count?: number;
  }>;
};

export const getDashboardKPIs = cache(
  async (): Promise<DashboardKPIs> => {
    const now = new Date();
    const today = startOfDay(now);
    const weekAgo = addDays(today, -7);
    const monthAgo = addDays(today, -30);

    // Obtener datos en paralelo
    const [
      // Producción
      otStats,
      horasProduccion,
      otUrgent,
      otProgress,
      
      // Cotizaciones
      quotesStats,
      quotesValue,
      
      // Inventario
      inventoryStats,
      stockBajo,
      movimientosRecientes,
      
      // Compras
      scPendientes,
      ocAbiertas,
      comprasRecientes,
    ] = await Promise.all([
      // Estadísticas de OTs
      prisma.ordenTrabajo.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
      
      // Horas de producción
      prisma.parteProduccion.aggregate({
        where: { fecha: { gte: weekAgo } },
        _sum: { horas: true },
      }),
      
      // OTs urgentes
      prisma.ordenTrabajo.count({
        where: {
          estado: { in: ["OPEN", "IN_PROGRESS"] },
          prioridad: "URGENT"
        }
      }),
      
      // Progreso general de OTs
      prisma.ordenTrabajo.findMany({
        where: { estado: { in: ["OPEN", "IN_PROGRESS"] } },
        include: {
          piezas: { select: { qtyPlan: true, qtyHecha: true } }
        }
      }),
      
      // Estadísticas de cotizaciones
      prisma.cotizacion.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      
      // Valor de cotizaciones aprobadas
      prisma.cotizacion.aggregate({
        where: { status: 'APPROVED' },
        _sum: { total: true },
      }),
      
      // Estadísticas de inventario
      prisma.producto.count(),
      
      // Productos con stock bajo
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Producto" p
        LEFT JOIN (
          SELECT "productoId", SUM("cantidad") as stock
          FROM "Movimiento"
          GROUP BY "productoId"
        ) m ON p.sku = m."productoId"
        WHERE p."stockMinimo" IS NOT NULL 
        AND COALESCE(m.stock, 0) < p."stockMinimo"
      ` as Promise<[{ count: bigint }]>,
      
      // Movimientos recientes
      prisma.movimiento.count({
        where: { fecha: { gte: weekAgo } }
      }),
      
      // Solicitudes de compra pendientes
      prisma.solicitudCompra.count({
        where: { estado: { in: ["PENDING_ADMIN", "PENDING_GERENCIA"] } }
      }),
      
      // Órdenes de compra abiertas
      prisma.ordenCompra.count({
        where: { estado: "OPEN" }
      }),
      
      // Valor de compras recientes
      prisma.ordenCompra.aggregate({
        where: { fecha: { gte: monthAgo } },
        _sum: { total: true },
      }),
    ]);

    // Procesar estadísticas de OTs
    const otOpenCount = otStats.find(s => s.estado === 'OPEN')?._count.id ?? 0;
    const otInProgressCount = otStats.find(s => s.estado === 'IN_PROGRESS')?._count.id ?? 0;
    
    // Calcular progreso general
    let totalPlan = 0;
    let totalHecho = 0;
    for (const ot of otProgress) {
      const plan = ot.piezas.reduce((s, p) => s + toNum(p.qtyPlan), 0);
      const hecho = ot.piezas.reduce((s, p) => s + toNum(p.qtyHecha), 0);
      totalPlan += plan;
      totalHecho += hecho;
    }
    const avanceGeneral = totalPlan > 0 ? (totalHecho / totalPlan) * 100 : 0;
    
    // Procesar estadísticas de cotizaciones
    const draftQuotes = quotesStats.find(s => s.status === 'DRAFT')?._count.id ?? 0;
    const sentQuotes = quotesStats.find(s => s.status === 'SENT')?._count.id ?? 0;
    const approvedQuotes = quotesStats.find(s => s.status === 'APPROVED')?._count.id ?? 0;
    const rejectedQuotes = quotesStats.find(s => s.status === 'REJECTED')?._count.id ?? 0;
    
    // Calcular valor de inventario (aproximado)
    const inventoryValue = await prisma.$queryRaw`
      SELECT SUM(COALESCE(m.stock, 0) * p.costo) as value
      FROM "Producto" p
      LEFT JOIN (
        SELECT "productoId", SUM("cantidad") as stock
        FROM "Movimiento"
        GROUP BY "productoId"
      ) m ON p.sku = m."productoId"
    ` as [{ value: number | null }];
    
    // Horas de producción hoy
    const horasHoy = await prisma.parteProduccion.aggregate({
      where: { fecha: { gte: today } },
      _sum: { horas: true },
    });

    // Generar alertas
    const alerts: DashboardKPIs['alerts'] = [];
    
    if (otUrgent > 0) {
      alerts.push({
        type: 'error',
        title: 'OTs Urgentes',
        message: `${otUrgent} órdenes marcadas como urgentes requieren atención`,
        count: otUrgent
      });
    }
    
    if (scPendientes > 5) {
      alerts.push({
        type: 'warning',
        title: 'Solicitudes de Compra',
        message: `${scPendientes} solicitudes pendientes de aprobación`,
        count: scPendientes
      });
    }
    
    const stockBajoCount = Number(stockBajo[0]?.count ?? 0);
    if (stockBajoCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Stock Bajo',
        message: `${stockBajoCount} productos por debajo del stock mínimo`,
        count: stockBajoCount
      });
    }
    
    if (avanceGeneral < 30 && otInProgressCount > 0) {
      alerts.push({
        type: 'info',
        title: 'Avance de Producción',
        message: `Progreso general de OTs activas: ${Math.round(avanceGeneral)}%`,
      });
    }

    return {
      production: {
        otOpen: otOpenCount,
        otInProgress: otInProgressCount,
        otUrgent,
        horasUlt7d: toNum(horasProduccion._sum.horas),
        horasHoy: toNum(horasHoy._sum.horas),
        avanceGeneral: Math.round(avanceGeneral * 10) / 10,
      },
      quotes: {
        totalDrafts: draftQuotes,
        totalPending: sentQuotes,
        totalApproved: approvedQuotes,
        totalRejected: rejectedQuotes,
        valorTotalApproved: toNum(quotesValue._sum.total),
      },
      inventory: {
        totalProductos: inventoryStats,
        productosStockBajo: stockBajoCount,
        valorInventario: toNum(inventoryValue[0]?.value),
        movimientosRecientes,
      },
      purchases: {
        scPendientes,
        ocAbiertas,
        valorComprasUlt30d: toNum(comprasRecientes._sum.total),
      },
      alerts,
    };
  },
  ['dashboard:kpis'],
  { 
    tags: [
      cacheTags.workorders, 
      cacheTags.quotes, 
      cacheTags.inventoryProducts, 
      cacheTags.purchasesSC,
      cacheTags.purchasesOC
    ], 
    revalidate: 300 // 5 minutos
  }
);
