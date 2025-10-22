/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

// Bypass permisos
jest.mock('@/app/lib/guards', () => ({ assertCanWriteCosting: async () => {} }));
// No-op revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  unstable_cache: (fn: any) => fn,
  unstable_noStore: () => {},
}));

import { prisma } from '@/app/lib/prisma';
let upsertCatalogoItem: any, deleteCatalogoItem: any, resetCatalogoTipo: any;
beforeAll(async () => {
  const mod = await import('@/app/(protected)/admin/catalogos/actions');
  upsertCatalogoItem = mod.upsertCatalogoItem;
  deleteCatalogoItem = mod.deleteCatalogoItem;
  resetCatalogoTipo = mod.resetCatalogoTipo;
});
import { TipoCatalogo } from '@prisma/client';

describe('Admin/Catálogos actions', () => {
  afterEach(() => jest.restoreAllMocks());

  it('crea item nuevo con orden automático y propiedades para TIPO_TRABAJO', async () => {
    const fd = new FormData();
    fd.set('tipo', TipoCatalogo.TIPO_TRABAJO as unknown as string);
    fd.set('codigo', 'SERVICIO_PRUEBA');
    fd.set('nombre', 'Servicio de Prueba');
    fd.set('orden', '0'); // trigger orden automático
    fd.set('activo', 'on');
    fd.set('isSubcategory', 'true');
    fd.set('parent', 'SERVICIOS');

    const findUnique = jest.spyOn(prisma.configuracionCatalogo, 'findUnique').mockResolvedValueOnce(null as any);
    const aggregate = jest.spyOn(prisma.configuracionCatalogo, 'aggregate').mockResolvedValueOnce({ _max: { orden: 7 } } as any);
    const create = jest.spyOn(prisma.configuracionCatalogo, 'create').mockResolvedValueOnce({ id: 'new-id' } as any);

    const res = await upsertCatalogoItem(fd);

    expect(res.ok).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({ where: { tipo_codigo: { tipo: TipoCatalogo.TIPO_TRABAJO, codigo: 'SERVICIO_PRUEBA' } } });
    expect(aggregate).toHaveBeenCalledWith({ where: { tipo: TipoCatalogo.TIPO_TRABAJO }, _max: { orden: true } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tipo: TipoCatalogo.TIPO_TRABAJO,
        codigo: 'SERVICIO_PRUEBA',
        nombre: 'Servicio de Prueba',
        orden: 8, // 7 + 1
        activo: true,
        propiedades: { parent: 'SERVICIOS', isSubcategory: true },
      })
    }));
  });

  it('actualiza item existente', async () => {
    const fd = new FormData();
    fd.set('id', '00000000-0000-0000-0000-000000000000');
    fd.set('tipo', TipoCatalogo.MONEDA as unknown as string);
    fd.set('codigo', 'USD');
    fd.set('nombre', 'Dólar USA');
    fd.set('orden', '2');
    fd.set('activo', 'true');

    jest.spyOn(prisma.configuracionCatalogo, 'findUnique').mockResolvedValueOnce({ id: '00000000-0000-0000-0000-000000000000' } as any);
    const update = jest.spyOn(prisma.configuracionCatalogo, 'update').mockResolvedValueOnce({ id: '00000000-0000-0000-0000-000000000000' } as any);

    const res = await upsertCatalogoItem(fd);
    expect(res.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '00000000-0000-0000-0000-000000000000' },
      data: expect.objectContaining({ nombre: 'Dólar USA', orden: 2 })
    }));
  });

  it('soft delete de item', async () => {
    jest.spyOn(prisma.configuracionCatalogo, 'findUnique').mockResolvedValueOnce({ id: 'XYZ' } as any);
    const update = jest.spyOn(prisma.configuracionCatalogo, 'update').mockResolvedValueOnce({ id: 'XYZ' } as any);

    const res = await deleteCatalogoItem('XYZ');
    expect(res.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ where: { id: 'XYZ' }, data: { activo: false } });
  });

  it('reset de TIPO_TRABAJO reactiva y crea/upserta jerarquía', async () => {
    const updateMany = jest.spyOn(prisma.configuracionCatalogo, 'updateMany').mockResolvedValue({ count: 7 } as any);
    const upsert = jest.spyOn(prisma.configuracionCatalogo, 'upsert').mockResolvedValue({ id: 'ok' } as any);

    const res = await resetCatalogoTipo(TipoCatalogo.TIPO_TRABAJO);
    expect(res.ok).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: TipoCatalogo.TIPO_TRABAJO }, data: { activo: false } }));
    expect(upsert).toHaveBeenCalled();
  });
});
