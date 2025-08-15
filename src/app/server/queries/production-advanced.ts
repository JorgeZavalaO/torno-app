import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

/**
 * Optimizaciones adicionales para el módulo de control de producción
 */

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Obtener estadísticas de rendimiento por operador
 */
export const getOperatorPerformance = cache(
  async (days = 30) => {
    const until = new Date();
    const from = startOfDay(addDays(until, -days + 1));

    const stats = await prisma.parteProduccion.groupBy({
      by: ['userId'],
      where: {
        fecha: { gte: from, lte: until },
        horas: { gt: 0 }
      },
      _sum: {
        horas: true
      },
      _count: {
        id: true
      },
      _avg: {
        horas: true
      }
    });

    const usuarios = await prisma.userProfile.findMany({
      where: {
        id: { in: stats.map(s => s.userId) }
      },
      select: {
        id: true,
        displayName: true,
        email: true
      }
    });

    const performance = stats.map(stat => {
      const usuario = usuarios.find(u => u.id === stat.userId);
      return {
        usuarioId: stat.userId,
        nombre: usuario?.displayName || usuario?.email?.split('@')[0] || 'Desconocido',
        totalHoras: Number(stat._sum?.horas || 0),
        totalRegistros: stat._count?.id || 0,
        promedioHoras: Number(stat._avg?.horas || 0),
        horasPorDia: Number(stat._sum?.horas || 0) / days
      };
    }).sort((a, b) => b.totalHoras - a.totalHoras);

    return performance;
  },
  ['operator-performance'],
  { tags: [cacheTags.worklogs("")], revalidate: 300 }
);

/**
 * Obtener estadísticas de utilización de máquinas
 */
export const getMachineUtilization = cache(
  async (days = 30) => {
    const until = new Date();
    const from = startOfDay(addDays(until, -days + 1));

    const stats = await prisma.parteProduccion.groupBy({
      by: ['maquina'],
      where: {
        fecha: { gte: from, lte: until },
        horas: { gt: 0 },
        maquina: { not: null }
      },
      _sum: {
        horas: true
      },
      _count: {
        id: true
      }
    });

    const utilization = stats.map(stat => ({
      maquina: stat.maquina || 'Sin especificar',
      totalHoras: Number(stat._sum.horas || 0),
      totalUsos: stat._count.id,
      utilizacionPorcentaje: (Number(stat._sum.horas || 0) / (days * 8)) * 100, // Asumiendo 8h/día
      horasPorDia: Number(stat._sum.horas || 0) / days
    })).sort((a, b) => b.totalHoras - a.totalHoras);

    return utilization;
  },
  ['machine-utilization'],
  { tags: [cacheTags.worklogs("")], revalidate: 300 }
);

/**
 * Obtener alertas y notificaciones para el dashboard
 */
export const getProductionAlerts = cache(
  async () => {
    const alerts = [];

    // OTs atrasadas (más de 30 días desde creación sin progreso)
    const overdueOTs = await prisma.ordenTrabajo.findMany({
      where: {
        estado: { in: ["OPEN", "IN_PROGRESS"] },
        creadaEn: { lte: addDays(new Date(), -30) },
        piezas: {
          every: {
            qtyHecha: 0
          }
        }
      },
      select: { codigo: true, creadaEn: true },
      take: 5
    });

    if (overdueOTs.length > 0) {
      alerts.push({
        type: 'warning' as const,
        title: 'OTs sin progreso',
        message: `${overdueOTs.length} órdenes llevan más de 30 días sin avance`,
        count: overdueOTs.length
      });
    }

    // OTs urgentes
    const urgentOTs = await prisma.ordenTrabajo.count({
      where: {
        estado: { in: ["OPEN", "IN_PROGRESS"] },
        prioridad: "URGENT"
      }
    });

    if (urgentOTs > 0) {
      alerts.push({
        type: 'error' as const,
        title: 'OTs urgentes',
        message: `${urgentOTs} órdenes marcadas como urgentes`,
        count: urgentOTs
      });
    }

    // Máquinas sin uso reciente
    const recentMachines = await prisma.parteProduccion.groupBy({
      by: ['maquina'],
      where: {
        fecha: { gte: addDays(new Date(), -7) },
        maquina: { not: null }
      }
    });

    const allMachines = await prisma.parteProduccion.groupBy({
      by: ['maquina'],
      where: {
        maquina: { not: null }
      }
    });

    const unusedMachines = allMachines.length - recentMachines.length;
    if (unusedMachines > 0) {
      alerts.push({
        type: 'info' as const,
        title: 'Máquinas inactivas',
        message: `${unusedMachines} máquinas sin uso en los últimos 7 días`,
        count: unusedMachines
      });
    }

    return alerts;
  },
  ['production-alerts'],
  { tags: [cacheTags.workorders], revalidate: 600 }
);

/**
 * Obtener tendencias de producción (comparación con períodos anteriores)
 */
export const getProductionTrends = cache(
  async () => {
    const now = new Date();
    const thisWeekStart = startOfDay(addDays(now, -7));
    const lastWeekStart = startOfDay(addDays(now, -14));
    const lastWeekEnd = startOfDay(addDays(now, -7));

    const [thisWeek, lastWeek] = await Promise.all([
      prisma.parteProduccion.aggregate({
        where: {
          fecha: { gte: thisWeekStart, lte: now }
        },
        _sum: { horas: true },
        _count: { id: true }
      }),
      prisma.parteProduccion.aggregate({
        where: {
          fecha: { gte: lastWeekStart, lt: lastWeekEnd }
        },
        _sum: { horas: true },
        _count: { id: true }
      })
    ]);

    const thisWeekHours = Number(thisWeek._sum.horas || 0);
    const lastWeekHours = Number(lastWeek._sum.horas || 0);
    const hoursChange = lastWeekHours > 0 ? ((thisWeekHours - lastWeekHours) / lastWeekHours) * 100 : 0;

    const thisWeekEntries = thisWeek._count.id;
    const lastWeekEntries = lastWeek._count.id;
    const entriesChange = lastWeekEntries > 0 ? ((thisWeekEntries - lastWeekEntries) / lastWeekEntries) * 100 : 0;

    return {
      horasEsta: thisWeekHours,
      horasAnterior: lastWeekHours,
      cambioHoras: Math.round(hoursChange * 10) / 10,
      registrosEsta: thisWeekEntries,
      registrosAnterior: lastWeekEntries,
      cambioRegistros: Math.round(entriesChange * 10) / 10
    };
  },
  ['production-trends'],
  { tags: [cacheTags.worklogs("")], revalidate: 3600 }
);
