/**
 * Estrategias de caché optimizadas para diferentes tipos de datos
 */

export const cacheConfig = {
  // Datos de configuración (cambian muy poco)
  static: {
    revalidate: 3600, // 1 hora
    tags: ['static-config'],
  },
  
  // Datos maestros (productos, clientes, proveedores)
  master: {
    revalidate: 1800, // 30 minutos
    tags: ['master-data'],
  },
  
  // Datos transaccionales activos (OTs, producción)
  transactional: {
    revalidate: 60, // 1 minuto
    tags: ['transactional'],
  },
  
  // Datos de tiempo real (stock, dashboard)
  realtime: {
    revalidate: 30, // 30 segundos
    tags: ['realtime'],
  },
  
  // Reportes y analytics
  analytics: {
    revalidate: 300, // 5 minutos
    tags: ['analytics'],
  },
} as const;

/**
 * Helper para invalidar cachés por categoría
 */
export function getInvalidationTags(operation: 'stock' | 'production' | 'purchases' | 'quotes' | 'machines'): string[] {
  const tagMap = {
    stock: [cacheConfig.realtime.tags[0], cacheConfig.transactional.tags[0]],
    production: [cacheConfig.realtime.tags[0], cacheConfig.transactional.tags[0], cacheConfig.analytics.tags[0]],
    purchases: [cacheConfig.transactional.tags[0], cacheConfig.analytics.tags[0]],
    quotes: [cacheConfig.transactional.tags[0]],
    machines: [cacheConfig.transactional.tags[0], cacheConfig.analytics.tags[0]],
  };
  
  return tagMap[operation] || [];
}

/**
 * Tipos de caché por módulo para mayor granularidad
 */
export const moduleCache = {
  inventory: {
    products: { revalidate: 300, tags: ['inventory:products'] },
    movements: { revalidate: 60, tags: ['inventory:movements'] },
    kardex: { revalidate: 120, tags: ['inventory:kardex'] },
    stock: { revalidate: 30, tags: ['inventory:stock'] },
  },
  
  production: {
    workorders: { revalidate: 120, tags: ['production:workorders'] },
    worklogs: { revalidate: 60, tags: ['production:worklogs'] },
    overview: { revalidate: 30, tags: ['production:overview'] },
    performance: { revalidate: 300, tags: ['production:performance'] },
  },
  
  purchases: {
    requests: { revalidate: 180, tags: ['purchases:requests'] },
    orders: { revalidate: 240, tags: ['purchases:orders'] },
    providers: { revalidate: 1800, tags: ['purchases:providers'] },
  },
  
  quotes: {
    list: { revalidate: 300, tags: ['quotes:list'] },
    params: { revalidate: 3600, tags: ['quotes:params'] },
  },
  
  machines: {
    list: { revalidate: 600, tags: ['machines:list'] },
    events: { revalidate: 120, tags: ['machines:events'] },
    maintenance: { revalidate: 300, tags: ['machines:maintenance'] },
  },
} as const;
