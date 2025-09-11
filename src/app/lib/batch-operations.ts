import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Utilidades para actualizaciones optimizadas en lote
 */

export class BatchOperations {
  private static readonly BATCH_SIZE = 100;
  
  /**
   * Actualización masiva de stock con upsert optimizado
   */
  static async updateStockBatch(
    updates: Array<{ sku: string; cantidad: number; costoUnitario: number; tipo: 'INGRESO_COMPRA' | 'INGRESO_AJUSTE' | 'SALIDA_AJUSTE' | 'SALIDA_OT' | 'INGRESO_OT'; nota?: string }>
  ) {
    const batches = this.chunk(updates, this.BATCH_SIZE);
    
    for (const batch of batches) {
      await prisma.$transaction(async (tx) => {
        // Crear movimientos en lote
        await tx.movimiento.createMany({
          data: batch.map(update => ({
            productoId: update.sku,
            tipo: update.tipo,
            cantidad: new Prisma.Decimal(update.cantidad),
            costoUnitario: new Prisma.Decimal(update.costoUnitario),
            nota: update.nota || null,
            refTabla: 'BATCH_UPDATE',
            refId: `BATCH_${Date.now()}`,
          })),
        });
        
        // Actualizar costos de productos si es ingreso
        const ingresos = batch.filter(u => u.tipo.includes('INGRESO'));
        if (ingresos.length > 0) {
          for (const ingreso of ingresos) {
            await tx.producto.update({
              where: { sku: ingreso.sku },
              data: { costo: new Prisma.Decimal(ingreso.costoUnitario) },
            });
          }
        }
      });
    }
  }
  
  /**
   * Actualización masiva de estado de OTs
   */
  static async updateOTStatusBatch(updates: Array<{ id: string; estado: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' }>) {
    const statusGroups = this.groupBy(updates, 'estado');
    
    for (const [estado, items] of Object.entries(statusGroups)) {
      const ids = items.map(item => item.id);
      await prisma.ordenTrabajo.updateMany({
        where: { id: { in: ids } },
        data: { estado: estado as 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' },
      });
    }
  }
  
  /**
   * Creación masiva de partes de producción con validación
   */
  static async createProductionLogsBatch(
    logs: Array<{
      otId: string;
      userId: string;
      horas: number;
      maquina?: string;
      nota?: string;
      fecha?: Date;
    }>
  ) {
    // Validar que las OTs existan
    const otIds = [...new Set(logs.map(log => log.otId))];
    const existingOTs = await prisma.ordenTrabajo.findMany({
      where: { id: { in: otIds } },
      select: { id: true, estado: true },
    });
    
    const validOTIds = new Set(existingOTs.map(ot => ot.id));
    const validLogs = logs.filter(log => validOTIds.has(log.otId));
    
    if (validLogs.length === 0) {
      throw new Error('No se encontraron OTs válidas');
    }
    
    const batches = this.chunk(validLogs, this.BATCH_SIZE);
    
    for (const batch of batches) {
      await prisma.$transaction(async (tx) => {
        await tx.parteProduccion.createMany({
          data: batch.map(log => ({
            otId: log.otId,
            userId: log.userId,
            horas: new Prisma.Decimal(log.horas),
            maquina: log.maquina || null,
            nota: log.nota || null,
            fecha: log.fecha || new Date(),
          })),
        });
        
        // Actualizar estado de OTs OPEN a IN_PROGRESS
        const otsToUpdate = batch
          .map(log => log.otId)
          .filter((id, index, arr) => arr.indexOf(id) === index);
          
        await tx.ordenTrabajo.updateMany({
          where: {
            id: { in: otsToUpdate },
            estado: 'OPEN',
          },
          data: { estado: 'IN_PROGRESS' },
        });
      });
    }
    
    return { processed: validLogs.length, skipped: logs.length - validLogs.length };
  }
  
  /**
   * Limpieza de datos antiguos para mantener rendimiento
   */
  static async cleanupOldData(daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const results = await prisma.$transaction(async (tx) => {
      // Limpiar eventos de máquina antiguos (mantener los más recientes)
      const oldEvents = await tx.maquinaEvento.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          fin: { not: null }, // Solo eventos finalizados
        },
      });
      
      // Limpiar partes de producción muy antiguos de OTs completadas
      const oldLogs = await tx.parteProduccion.deleteMany({
        where: {
          fecha: { lt: cutoffDate },
          ot: { estado: 'DONE' },
        },
      });
      
      return {
        deletedEvents: oldEvents.count,
        deletedLogs: oldLogs.count,
      };
    });
    
    return results;
  }
  
  /**
   * Utilidad para dividir arrays en chunks
   */
  private static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Utilidad para agrupar por propiedad
   */
  private static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}

/**
 * Tarea de mantenimiento programada
 */
export async function performMaintenanceTasks() {
  try {
    // Limpiar datos antiguos
    const cleanupResult = await BatchOperations.cleanupOldData(365);
    
    // Actualizar estadísticas de la base de datos (PostgreSQL)
    await prisma.$executeRaw`ANALYZE`;
    
    console.log('Mantenimiento completado:', cleanupResult);
    return cleanupResult;
  } catch (error) {
    console.error('Error en mantenimiento:', error);
    throw error;
  }
}
