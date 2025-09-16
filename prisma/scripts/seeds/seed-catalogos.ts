/**
 * Script de seed para poblar la tabla configuracionCatalogo
 * con los valores esperados por los componentes del frontend
 */

import { PrismaClient, TipoCatalogo } from '@prisma/client';

const prisma = new PrismaClient();

interface CatalogItem {
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  color?: string;
  icono?: string;
}

interface CatalogDefinition {
  tipo: string;
  items: CatalogItem[];
}

const catalogData: CatalogDefinition[] = [
  // UNIDAD_MEDIDA - Basado en el archivo uoms.ts eliminado
  {
    tipo: 'UNIDAD_MEDIDA',
    items: [
      { codigo: 'pz', nombre: 'Pieza', orden: 1 },
      { codigo: 'und', nombre: 'Unidad', orden: 2 },
      { codigo: 'par', nombre: 'Par', orden: 3 },
      { codigo: 'caja', nombre: 'Caja', orden: 4 },
      // Longitud
      { codigo: 'mm', nombre: 'Milímetro', orden: 10 },
      { codigo: 'cm', nombre: 'Centímetro', orden: 11 },
      { codigo: 'm', nombre: 'Metro', orden: 12 },
      { codigo: 'pulg', nombre: 'Pulgada', orden: 13 },
      { codigo: 'ft', nombre: 'Pie', orden: 14 },
      // Peso
      { codigo: 'g', nombre: 'Gramo', orden: 20 },
      { codigo: 'kg', nombre: 'Kilogramo', orden: 21 },
      { codigo: 'ton', nombre: 'Tonelada', orden: 22 },
      { codigo: 'lb', nombre: 'Libra', orden: 23 },
      // Volumen
      { codigo: 'ml', nombre: 'Mililitro', orden: 30 },
      { codigo: 'l', nombre: 'Litro', orden: 31 },
      { codigo: 'gal', nombre: 'Galón', orden: 32 },
      // Área
      { codigo: 'm2', nombre: 'Metro cuadrado', orden: 40 },
      { codigo: 'cm2', nombre: 'Centímetro cuadrado', orden: 41 },
      // Paquetes
      { codigo: 'pack', nombre: 'Paquete', orden: 50 },
      { codigo: 'set', nombre: 'Set', orden: 51 },
      { codigo: 'lote', nombre: 'Lote', orden: 52 },
      // Tiempo
      { codigo: 'hora', nombre: 'Hora', orden: 60 },
      { codigo: 'día', nombre: 'Día', orden: 61 },
    ]
  },

  // CATEGORIA_PRODUCTO - Basado en product-categories.ts
  {
    tipo: 'CATEGORIA_PRODUCTO',
    items: [
      { codigo: 'MATERIA_PRIMA', nombre: 'Materia Prima', orden: 1, color: '#8B5CF6' },
      { codigo: 'HERRAMIENTA_CORTE', nombre: 'Herramienta de Corte', orden: 2, color: '#EF4444' },
      { codigo: 'CONSUMIBLE', nombre: 'Consumible', orden: 3, color: '#F59E0B' },
      { codigo: 'REPUESTO', nombre: 'Repuesto', orden: 4, color: '#10B981' },
      { codigo: 'FABRICACION', nombre: 'Fabricación', orden: 5, color: '#3B82F6' },
    ]
  },

  // TIPO_MOVIMIENTO - Basado en new-movement-dialog.tsx
  {
    tipo: 'TIPO_MOVIMIENTO',
    items: [
      { 
        codigo: 'INGRESO_COMPRA', 
        nombre: 'Ingreso por compra', 
        descripcion: 'Productos recibidos de proveedores',
        orden: 1,
        color: '#10B981',
        icono: 'TrendingUp'
      },
      { 
        codigo: 'INGRESO_AJUSTE', 
        nombre: 'Ingreso por ajuste', 
        descripcion: 'Corrección de inventario (aumentar stock)',
        orden: 2,
        color: '#3B82F6',
        icono: 'Settings'
      },
      { 
        codigo: 'SALIDA_AJUSTE', 
        nombre: 'Salida por ajuste', 
        descripcion: 'Corrección de inventario (reducir stock)',
        orden: 3,
        color: '#F59E0B',
        icono: 'Settings'
      },
      { 
        codigo: 'SALIDA_OT', 
        nombre: 'Salida a OT', 
        descripcion: 'Materiales asignados a orden de trabajo',
        orden: 4,
        color: '#EF4444',
        icono: 'TrendingDown'
      },
    ]
  },

  // PRIORIDAD_OT - Basado en priority-select.tsx
  {
    tipo: 'PRIORIDAD_OT',
    items: [
      { codigo: 'LOW', nombre: 'Baja', orden: 1, color: '#64748B', icono: 'Minus' },
      { codigo: 'MEDIUM', nombre: 'Media', orden: 2, color: '#3B82F6', icono: 'ArrowUp' },
      { codigo: 'HIGH', nombre: 'Alta', orden: 3, color: '#F59E0B', icono: 'AlertTriangle' },
      { codigo: 'URGENT', nombre: 'Urgente', orden: 4, color: '#EF4444', icono: 'Zap' },
    ]
  },

  // TIPO_ACABADO - Basado en new-ot-dialog.tsx y edit-header-dialog.tsx
  {
    tipo: 'TIPO_ACABADO',
    items: [
      { codigo: 'NONE', nombre: 'Ninguno', orden: 1, color: '#6B7280' },
      { codigo: 'ZINCADO', nombre: 'Zincado', orden: 2, color: '#71717A', icono: 'Sparkles' },
      { codigo: 'TROPICALIZADO', nombre: 'Tropicalizado', orden: 3, color: '#10B981', icono: 'Brush' },
      { codigo: 'PINTADO', nombre: 'Pintado', orden: 4, color: '#3B82F6', icono: 'Palette' },
      { codigo: 'CROMADO', nombre: 'Cromado', orden: 5, color: '#94A3B8', icono: 'Sparkles' },
      { codigo: 'NATURAL', nombre: 'Natural', orden: 6, color: '#F59E0B', icono: 'Wrench' },
    ]
  },

  // ESTADO_OT - Estados básicos de órdenes de trabajo
  {
    tipo: 'ESTADO_OT',
    items: [
      { codigo: 'DRAFT', nombre: 'Borrador', orden: 1, color: '#6B7280' },
      { codigo: 'PLANNED', nombre: 'Planificada', orden: 2, color: '#3B82F6' },
      { codigo: 'IN_PROGRESS', nombre: 'En Progreso', orden: 3, color: '#F59E0B' },
      { codigo: 'COMPLETED', nombre: 'Completada', orden: 4, color: '#10B981' },
      { codigo: 'CANCELLED', nombre: 'Cancelada', orden: 5, color: '#EF4444' },
    ]
  },

  // ESTADO_MAQUINA - Estados de máquinas
  {
    tipo: 'ESTADO_MAQUINA',
    items: [
      { codigo: 'ACTIVA', nombre: 'Activa', orden: 1, color: '#10B981' },
      { codigo: 'MANTENIMIENTO', nombre: 'Mantenimiento', orden: 2, color: '#F59E0B' },
      { codigo: 'BAJA', nombre: 'Fuera de Servicio', orden: 3, color: '#EF4444' },
    ]
  },

  // EVENTO_MAQUINA - Tipos de eventos de máquinas
  {
    tipo: 'EVENTO_MAQUINA',
    items: [
      { codigo: 'USO', nombre: 'En Uso', orden: 1, color: '#10B981' },
      { codigo: 'PARO', nombre: 'Parada', orden: 2, color: '#F59E0B' },
      { codigo: 'MANTENIMIENTO', nombre: 'Mantenimiento', orden: 3, color: '#3B82F6' },
      { codigo: 'AVERIA', nombre: 'Avería', orden: 4, color: '#EF4444' },
      { codigo: 'DISPONIBLE', nombre: 'Disponible', orden: 5, color: '#6B7280' },
    ]
  },

  // ESTADO_SC - Estados de solicitudes de compra
  {
    tipo: 'ESTADO_SC',
    items: [
      { codigo: 'DRAFT', nombre: 'Borrador', orden: 1, color: '#6B7280' },
      { codigo: 'PENDING', nombre: 'Pendiente', orden: 2, color: '#F59E0B' },
      { codigo: 'APPROVED', nombre: 'Aprobada', orden: 3, color: '#10B981' },
      { codigo: 'REJECTED', nombre: 'Rechazada', orden: 4, color: '#EF4444' },
      { codigo: 'CANCELLED', nombre: 'Cancelada', orden: 5, color: '#6B7280' },
    ]
  },

  // ESTADO_OC - Estados de órdenes de compra
  {
    tipo: 'ESTADO_OC',
    items: [
      { codigo: 'DRAFT', nombre: 'Borrador', orden: 1, color: '#6B7280' },
      { codigo: 'SENT', nombre: 'Enviada', orden: 2, color: '#3B82F6' },
      { codigo: 'CONFIRMED', nombre: 'Confirmada', orden: 3, color: '#10B981' },
      { codigo: 'PARTIAL', nombre: 'Parcial', orden: 4, color: '#F59E0B' },
      { codigo: 'RECEIVED', nombre: 'Recibida', orden: 5, color: '#10B981' },
      { codigo: 'CANCELLED', nombre: 'Cancelada', orden: 6, color: '#EF4444' },
    ]
  },

  // ESTADO_COTIZACION - Estados de cotizaciones
  {
    tipo: 'ESTADO_COTIZACION',
    items: [
      { codigo: 'DRAFT', nombre: 'Borrador', orden: 1, color: '#6B7280' },
      { codigo: 'SENT', nombre: 'Enviada', orden: 2, color: '#3B82F6' },
      { codigo: 'APPROVED', nombre: 'Aprobada', orden: 3, color: '#10B981' },
      { codigo: 'REJECTED', nombre: 'Rechazada', orden: 4, color: '#EF4444' },
      { codigo: 'EXPIRED', nombre: 'Expirada', orden: 5, color: '#6B7280' },
    ]
  },

  // MONEDA - Monedas del sistema
  {
    tipo: 'MONEDA',
    items: [
      { codigo: 'PEN', nombre: 'Sol Peruano', descripcion: 'Moneda nacional de Perú', orden: 1, color: '#DC2626', icono: 'DollarSign' },
      { codigo: 'USD', nombre: 'Dólar Americano', descripcion: 'Moneda estadounidense', orden: 2, color: '#10B981', icono: 'DollarSign' },
      { codigo: 'EUR', nombre: 'Euro', descripcion: 'Moneda europea', orden: 3, color: '#3B82F6', icono: 'Euro' },
      { codigo: 'CLP', nombre: 'Peso Chileno', descripcion: 'Moneda nacional de Chile', orden: 4, color: '#F59E0B', icono: 'DollarSign' },
      { codigo: 'COP', nombre: 'Peso Colombiano', descripcion: 'Moneda nacional de Colombia', orden: 5, color: '#8B5CF6', icono: 'DollarSign' },
      { codigo: 'MXN', nombre: 'Peso Mexicano', descripcion: 'Moneda nacional de México', orden: 6, color: '#EF4444', icono: 'DollarSign' },
    ]
  },

  // TIPO_PARAMETRO - Tipos de parámetros del sistema
  {
    tipo: 'TIPO_PARAMETRO',
    items: [
      { codigo: 'NUMBER', nombre: 'Número', descripcion: 'Valor numérico simple', orden: 1, color: '#3B82F6', icono: 'Hash' },
      { codigo: 'PERCENT', nombre: 'Porcentaje', descripcion: 'Valor porcentual (0-100%)', orden: 2, color: '#10B981', icono: 'Percent' },
      { codigo: 'CURRENCY', nombre: 'Moneda', descripcion: 'Valor monetario en la moneda base', orden: 3, color: '#F59E0B', icono: 'DollarSign' },
      { codigo: 'TEXT', nombre: 'Texto', descripcion: 'Valor de texto libre', orden: 4, color: '#8B5CF6', icono: 'Type' },
    ]
  },
];

async function main() {
  console.log('🌱 Seeding catálogos...');
  
  for (const catalog of catalogData) {
    console.log(`   📂 Seeding ${catalog.tipo}...`);
    
    for (const item of catalog.items) {
      try {
        await prisma.configuracionCatalogo.upsert({
          where: {
            tipo_codigo: {
              tipo: catalog.tipo as TipoCatalogo,
              codigo: item.codigo,
            },
          },
          update: {
            nombre: item.nombre,
            descripcion: item.descripcion || null,
            orden: item.orden,
            color: item.color || null,
            icono: item.icono || null,
            activo: true,
          },
          create: {
            tipo: catalog.tipo as TipoCatalogo,
            codigo: item.codigo,
            nombre: item.nombre,
            descripcion: item.descripcion || null,
            orden: item.orden,
            color: item.color || null,
            icono: item.icono || null,
            activo: true,
          },
        });
        console.log(`      ✅ ${item.codigo}: ${item.nombre}`);
      } catch (error) {
        console.error(`      ❌ Error creating ${item.codigo}:`, error);
      }
    }
  }
  
  console.log('✅ Catálogos seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding catálogos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });