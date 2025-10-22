import { prisma } from '@/app/lib/prisma';
import { TipoCatalogo, Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

export interface CatalogoItem {
  id: string;
  tipo: TipoCatalogo;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  color: string | null;
  icono: string | null;
  propiedades: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogosByTipo {
  [key: string]: CatalogoItem[];
}

/**
 * Obtener todos los elementos del catálogo por tipo (incluyendo inactivos para administración)
 */
export const getCatalogosByTipoAdmin = unstable_cache(
  async (): Promise<CatalogosByTipo> => {
    const items = await prisma.configuracionCatalogo.findMany({
      // No filtrar por activo para mostrar todos en admin
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }],
    });

    const catalogosByTipo: CatalogosByTipo = {};
    
    for (const item of items) {
      const tipoKey = item.tipo;
      if (!catalogosByTipo[tipoKey]) {
        catalogosByTipo[tipoKey] = [];
      }
      catalogosByTipo[tipoKey].push(item as CatalogoItem);
    }

    return catalogosByTipo;
  },
  ['catalogos:admin:all'],
  { revalidate: 300 }
);

/**
 * Obtener todos los elementos del catálogo por tipo (solo activos para uso general)
 */
export const getCatalogosByTipo = unstable_cache(
  async (): Promise<CatalogosByTipo> => {
    const items = await prisma.configuracionCatalogo.findMany({
      where: { activo: true },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }],
    });

    const catalogosByTipo: CatalogosByTipo = {};
    
    for (const item of items) {
      const tipoKey = item.tipo;
      if (!catalogosByTipo[tipoKey]) {
        catalogosByTipo[tipoKey] = [];
      }
      catalogosByTipo[tipoKey].push(item as CatalogoItem);
    }

    return catalogosByTipo;
  },
  ['catalogos:all'],
  { revalidate: 300 }
);

/**
 * Obtener elementos de un tipo específico de catálogo
 */
export async function getCatalogoByTipo(tipo: TipoCatalogo): Promise<CatalogoItem[]> {
  const items = await prisma.configuracionCatalogo.findMany({
    where: { 
      tipo,
      activo: true 
    },
    orderBy: { orden: 'asc' },
  });
  
  return items as CatalogoItem[];
}

/**
 * Obtener un elemento específico del catálogo
 */
export const getCatalogoItem = async (tipo: TipoCatalogo, codigo: string): Promise<CatalogoItem | null> => {
  const item = await prisma.configuracionCatalogo.findUnique({
    where: {
      tipo_codigo: {
        tipo,
        codigo,
      },
    },
  });
  
  return item as CatalogoItem | null;
};

/**
 * Helper para obtener opciones de select formateadas
 */
export const getCatalogoOptions = async (tipo: TipoCatalogo) => {
  const items = await getCatalogoByTipo(tipo);
  return items.map(item => ({
    value: item.codigo,
    label: item.nombre,
    color: item.color,
    icono: item.icono,
    descripcion: item.descripcion,
  }));
};

/**
 * Helper para obtener el nombre de un elemento del catálogo
 */
export const getCatalogoNombre = async (tipo: TipoCatalogo, codigo: string): Promise<string> => {
  const item = await getCatalogoItem(tipo, codigo);
  return item?.nombre || codigo;
};

/**
 * Mapeos para conversión de enums existentes
 */
export const ENUM_TO_CATALOGO_MAP = {
  // Productos
  CategoriaProducto: 'CATEGORIA_PRODUCTO' as TipoCatalogo,
  TipoMovimiento: 'TIPO_MOVIMIENTO' as TipoCatalogo,
  
  // OT
  EstadoOT: 'ESTADO_OT' as TipoCatalogo,
  PrioridadOT: 'PRIORIDAD_OT' as TipoCatalogo,
  
  // Máquinas
  MaquinaEstado: 'ESTADO_MAQUINA' as TipoCatalogo,
  MaquinaEventoTipo: 'EVENTO_MAQUINA' as TipoCatalogo,
  
  // Compras
  EstadoSC: 'ESTADO_SC' as TipoCatalogo,
  EstadoOC: 'ESTADO_OC' as TipoCatalogo,
  
  // Cotizaciones
  QuoteStatus: 'ESTADO_COTIZACION' as TipoCatalogo,
  ParamType: 'TIPO_PARAMETRO' as TipoCatalogo,
};

/**
 * Helper para invalidar cache de catálogos
 */
export const invalidateCatalogosCache = () => {
  // Aquí usaríamos revalidateTag cuando esté disponible
  // Por ahora, el unstable_cache se revalida automáticamente
};