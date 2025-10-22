/**
 * Prueba de integración: Recepción de OC y recálculo de costo promedio ponderado.
 * 
 * - Requiere base de datos Postgres de prueba y DATABASE_URL_TEST configurado.
 * - Si no hay DATABASE_URL_TEST, la prueba se marca como skipped automáticamente.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

const DB_URL = process.env.DATABASE_URL_TEST;

// Si no hay BD de prueba configurada, saltar todo el suite
if (!DB_URL) {
  describe.skip('Integración Inventario (costo promedio)', () => {
    it('requires DATABASE_URL_TEST', () => {
      // skipped
    });
  });
} else {
  // Necesitamos imponer que prisma use la URL de test ANTES de importar acciones
  process.env.DATABASE_URL = DB_URL;

  // Mocks mínimos para acciones de servidor
  jest.doMock('@/app/lib/guards', () => ({
    assertCanWritePurchases: async () => {},
  }));
  jest.doMock('@/app/lib/auth', () => ({
    getCurrentUser: async () => ({ id: 'u_test', email: 'test@example.com', name: 'Tester' }),
  }));
  jest.doMock('@/app/(protected)/ot/actions', () => ({
    recomputeOTCosts: async () => {},
  }));

  // Importes diferidos (después de setear env y mocks)
  // Nota: imports dinámicos para asegurar que usen los mocks previos
  const actionsPromise = import('@/app/(protected)/compras/actions');

  describe('Integración Inventario (costo promedio)', () => {
    let prisma: any;
    let CategoriaProducto: any;

    beforeAll(async () => {
      const prismaMod = await import('@prisma/client');
      const { PrismaClient: PrismaClientCtor } = prismaMod as unknown as { PrismaClient: new (...args: any[]) => any };
      CategoriaProducto = (prismaMod as any).CategoriaProducto;
      prisma = new PrismaClientCtor({ datasources: { db: { url: DB_URL } } });
      // Cleanup selectivo por claves de prueba
      await prisma.$transaction([
        prisma.movimiento.deleteMany({ where: { refTabla: { in: ['OC'] } } }),
        prisma.oCItem.deleteMany({ where: { ordenCompra: { codigo: { startsWith: 'OC-IT-' } } } }),
        prisma.ordenCompra.deleteMany({ where: { codigo: { startsWith: 'OC-IT-' } } }),
        prisma.sCItem.deleteMany({ where: { solicitudCompra: { notas: 'IT-INVENTARIO' } } }),
        prisma.solicitudCompra.deleteMany({ where: { notas: 'IT-INVENTARIO' } }),
        prisma.proveedor.deleteMany({ where: { nombre: 'Proveedor IT' } }),
        prisma.producto.deleteMany({ where: { sku: 'SKU-IT-1' } }),
        prisma.userProfile.deleteMany({ where: { email: 'test@example.com' } }),
      ]);

      // Seed mínimo
      await prisma.userProfile.create({
        data: {
          stackUserId: 'stack_test',
          email: 'test@example.com',
          displayName: 'Tester',
        },
      });
      await prisma.producto.create({
        data: {
          sku: 'SKU-IT-1',
          nombre: 'Producto Test Integración',
          categoria: CategoriaProducto.FABRICACION,
          uom: 'pz',
          costo: 0,
        },
      });
      await prisma.proveedor.create({
        data: {
          nombre: 'Proveedor IT',
          ruc: '20123456789',
        },
      });
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('recalcula costo promedio ponderado con recepciones total y parcial', async () => {
  type CreateResult = { ok: boolean; id?: string; codigo?: string; message?: string };
  type ReceiveResult = { ok: boolean; newEstado?: string; message?: string };
  const { createSC, setSCState, createOC, receiveOC } = await actionsPromise;

      // 1) Crear SC aprobada
      const scFD = new FormData();
      scFD.set('otId', '');
      scFD.set('notas', 'IT-INVENTARIO');
      scFD.set('items', JSON.stringify([
        { productoId: 'SKU-IT-1', cantidad: 10, costoEstimado: 100 },
      ]));
  const scRes = await createSC(scFD) as CreateResult;
      expect(scRes.ok).toBe(true);
  const scId = scRes.id as string;
      expect(scId).toBeTruthy();

      const stRes = await setSCState(scId, 'APPROVED');
      expect(stRes.ok).toBe(true);

      // Obtener ids auxiliares
      const prov = await prisma.proveedor.findFirstOrThrow({ where: { nombre: 'Proveedor IT' } });

      // 2) Crear OC por 10 @ 100
      const ocFD = new FormData();
      ocFD.set('scId', scId);
      ocFD.set('proveedorId', prov.id);
      ocFD.set('codigo', 'OC-IT-1');
      ocFD.set('items', JSON.stringify([
        { productoId: 'SKU-IT-1', cantidad: 10, costoUnitario: 100 },
      ]));
  const ocRes = await createOC(ocFD) as CreateResult;
      expect(ocRes.ok).toBe(true);

      // 3) Recepción parcial: 4 unidades
      const rxFD1 = new FormData();
  rxFD1.set('ocId', ocRes.id!);
      rxFD1.set('items', JSON.stringify([
        { productoId: 'SKU-IT-1', cantidad: 4 },
      ]));
  const r1 = await receiveOC(rxFD1) as ReceiveResult;
      expect(r1.ok).toBe(true);
  expect(r1.newEstado).toBe('PARTIAL');

      const p1 = await prisma.producto.findUniqueOrThrow({ where: { sku: 'SKU-IT-1' } });
      expect(Number(p1.costo)).toBe(100); // primer promedio con solo una recepción queda 100

      // 4) Recepción restante: 6 unidades -> estado RECEIVED
      const rxFD2 = new FormData();
  rxFD2.set('ocId', ocRes.id!);
      rxFD2.set('items', JSON.stringify([
        { productoId: 'SKU-IT-1', cantidad: 6 },
      ]));
  const r2 = await receiveOC(rxFD2) as ReceiveResult;
      expect(r2.ok).toBe(true);
  expect(r2.newEstado).toBe('RECEIVED');

      // 5) Nueva OC por 10 @ 150 y recepción total
      const ocFD2 = new FormData();
      ocFD2.set('scId', scId);
      ocFD2.set('proveedorId', prov.id);
      ocFD2.set('codigo', 'OC-IT-2');
      ocFD2.set('items', JSON.stringify([
        { productoId: 'SKU-IT-1', cantidad: 10, costoUnitario: 150 },
      ]));
  const ocRes2 = await createOC(ocFD2) as CreateResult;
      expect(ocRes2.ok).toBe(true);

      const rxFD3 = new FormData();
  rxFD3.set('ocId', ocRes2.id!);
      // Recepción total (sin items especificados -> recibe lo pendiente)
  const r3 = await receiveOC(rxFD3) as ReceiveResult;
      expect(r3.ok).toBe(true);
  expect(r3.newEstado).toBe('RECEIVED');

      const p2 = await prisma.producto.findUniqueOrThrow({ where: { sku: 'SKU-IT-1' } });
      // Promedio ponderado de últimas compras: (10*100 + 10*150) / 20 = 125
      expect(Number(p2.costo)).toBe(125);

      // Verificar movimientos vinculados a OCs
      const movs = await prisma.movimiento.findMany({ where: { productoId: 'SKU-IT-1', refTabla: 'OC' }, orderBy: { fecha: 'asc' } });
      // 3 movimientos: 4, 6 y 10
      expect(movs.length).toBe(3);
      expect(Number(movs[0].cantidad)).toBe(4);
      expect(Number(movs[1].cantidad)).toBe(6);
      expect(Number(movs[2].cantidad)).toBe(10);
    });
  });
}
