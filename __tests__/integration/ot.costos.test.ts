/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integración: Recomputo de costos de OT
 * - Prepara OT con materiales emitidos (SALIDA_OT), partes con horas y piezas hechas
 * - Ejecuta recomputeOTCosts y verifica snapshot en OrdenTrabajo
 */

import { jest } from '@jest/globals';

const DB_URL = process.env.DATABASE_URL_TEST;

if (!DB_URL) {
  describe.skip('Integración OT (costos)', () => {
    it('requires DATABASE_URL_TEST', () => {});
  });
} else {
  process.env.DATABASE_URL = DB_URL;

  // Mocks mínimos
  jest.doMock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
    unstable_noStore: () => {},
    revalidatePath: () => {},
    revalidateTag: () => {},
  }));

  const prismaModPromise = import('@prisma/client');
  const actionsPromise = import('@/app/(protected)/ot/actions');

  describe('Integración OT (costos)', () => {
    let prisma: any;

    beforeAll(async () => {
      const prismaMod = await prismaModPromise as unknown as { PrismaClient: new (...args: any[]) => any; CategoriaProducto: any };
      prisma = new prismaMod.PrismaClient({ datasources: { db: { url: DB_URL } } });

      // Cleanup selectivo
      await prisma.$transaction([
        prisma.movimiento.deleteMany({ where: { refTabla: 'OrdenTrabajo' } }),
        prisma.oTMaterial.deleteMany({ where: { ot: { codigo: { startsWith: 'OT-IT-' } } } }),
        prisma.oTPieza.deleteMany({ where: { ot: { codigo: { startsWith: 'OT-IT-' } } } }),
        prisma.parteProduccion.deleteMany({ where: { ot: { codigo: { startsWith: 'OT-IT-' } } } }),
        prisma.ordenTrabajo.deleteMany({ where: { codigo: { startsWith: 'OT-IT-' } } }),
        prisma.producto.deleteMany({ where: { sku: { in: ['MAT-OT-1'] } } }),
        prisma.userProfile.deleteMany({ where: { email: 'ot@test.local' } }),
      ]);

      // Seed mínimo (usuario, producto, OT)
      await prisma.userProfile.create({ data: { stackUserId: 'stack_ot', email: 'ot@test.local' } });
      await prisma.producto.create({ data: { sku: 'MAT-OT-1', nombre: 'Material OT', categoria: 'CONSUMIBLE', uom: 'pz', costo: 50 } });
    });

    afterAll(async () => { await prisma.$disconnect(); });

    it('calcula costMaterials, costOverheads (hora + tooling) y costTotal', async () => {
      // Crear OT directa (evitar reglas de createOT para centrarnos en costes)
      const ot = await prisma.ordenTrabajo.create({ data: { codigo: 'OT-IT-0001' } });

      // Piezas con qtyHecha para habilitar tooling
      await prisma.oTPieza.create({ data: { otId: ot.id, descripcion: 'Pieza A', qtyPlan: 10, qtyHecha: 4 } });

      // Parte de producción: 3 horas (labor depende de hourlyRate; defaults no lo tienen => 0)
      await prisma.parteProduccion.create({ data: { otId: ot.id, userId: (await prisma.userProfile.findFirst()).id, horas: 3 } });

      // Emisión de materiales: 2 uds @ 50
      await prisma.movimiento.create({ data: { productoId: 'MAT-OT-1', tipo: 'SALIDA_OT', cantidad: -2, costoUnitario: 50, refTabla: 'OrdenTrabajo', refId: ot.id, nota: 'IT' } });

      const { recomputeOTCosts } = await actionsPromise;
      await recomputeOTCosts(ot.id);

      const updated = await prisma.ordenTrabajo.findUnique({ where: { id: ot.id } });

      // Defaults:
      // rentPerHour = 10.00, deprPerHour = 0 (no existe en defaults), hourlyRate = 0 (no existe)
      // toolingPerPiece = 2.50
      // horas = 3 → overhead por hora = 10 * 3 = 30
      // piezasHechas = 4 → tooling = 2.5 * 4 = 10
      // materiales: | -2 | * 50 = 100
      // costTotal = 100 + 0 + (30 + 10) = 140
      expect(Number(updated?.costMaterials)).toBe(100);
      expect(Number(updated?.costOverheads)).toBe(40);
      expect(Number(updated?.costLabor)).toBe(0);
      expect(Number(updated?.costTotal)).toBe(140);
    });
  });
}
