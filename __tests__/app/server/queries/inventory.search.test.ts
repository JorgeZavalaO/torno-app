/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

// Mock next/cache for cached function variants (we'll import the uncached one)
jest.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  unstable_noStore: () => {},
}));

import { prisma } from '@/app/lib/prisma';
import { getProductsWithStockUncached } from '@/app/server/queries/inventory';

describe('Inventory query search with equivalent codes', () => {
  const originals: Record<string, any> = {};
  afterEach(() => {
    if (originals.$queryRaw) (prisma as any).$queryRaw = originals.$queryRaw;
    jest.restoreAllMocks();
  });

  it('incluye productos encontrados por códigos equivalentes', async () => {
    // Mock equivalentes
    // Monkey-patch $queryRaw por ser método especial templated de Prisma
    originals.$queryRaw = (prisma as any).$queryRaw;
    const raw = ((strings: any) => {
      const sql = Array.isArray(strings) ? strings.join(' ') : String(strings);
      if (sql.includes('FROM "ProductoCodigoEquivalente"')) {
        return Promise.resolve([{ productoId: 'SKU-EX-1' }]);
      }
      if (sql.includes('FROM "Movimiento"')) {
        // Último costo por ingreso: ninguno, forzará uso de p.costo
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    }) as any;
    (prisma as any).$queryRaw = raw;

    const findMany = jest.spyOn(prisma.producto, 'findMany').mockResolvedValueOnce([
      { sku: 'SKU-EX-1', nombre: 'Equivalente', categoria: 'FABRICACION', uom: 'pz', costo: 12, stockMinimo: null, createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    const groupBy = jest.spyOn(prisma.movimiento, 'groupBy').mockResolvedValueOnce([
      { productoId: 'SKU-EX-1', _sum: { cantidad: 5 } },
    ] as any);

    const res = await getProductsWithStockUncached('cualquier texto');

  // Validamos que el mock haya sido invocado al menos una vez
  // (no tenemos contador al reasignar, así que verificamos efectos posteriormente)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.arrayContaining([
        expect.objectContaining({ sku: expect.objectContaining({ in: ['SKU-EX-1'] }) })
      ]) })
    }));

    expect(res).toEqual([
      expect.objectContaining({ sku: 'SKU-EX-1', stock: 5, refCost: 12 })
    ]);
    expect(groupBy).toHaveBeenCalled();
  });
});
