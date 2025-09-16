# Gestión de Catálogos Centralizados

Este documento describe la implementación de catálogos centralizados en el sistema Torno App.

## Resumen

Se migró de arrays hardcodeados en componentes a un sistema centralizado de catálogos que usa:
- 📄 Tabla `configuracionCatalogo` en la base de datos
- 🛠️ Servicio central `getCatalogoOptions()` 
- 🎨 Componentes que reciben opciones por props con fallbacks

## Arquitectura

### 1. Base de Datos
```sql
-- Tabla configuracionCatalogo
- id: UUID (PK)
- tipo: TipoCatalogo (enum)
- codigo: string (único por tipo)  
- nombre: string (etiqueta mostrada)
- descripcion: string? (opcional)
- orden: int (para ordenamiento)
- activo: boolean
- color: string? (colores hex para UI)
- icono: string? (nombres de iconos Lucide)
```

### 2. Servicio Central
```typescript
// src/app/server/services/catalogos.ts
export const getCatalogoOptions = async (tipo: TipoCatalogo) => {
  // Retorna: { value: string, label: string, color?: string, icono?: string }[]
}
```

### 3. Componentes Actualizados

#### ✅ Módulo Inventario
- **NewProductDialog**: recibe `uomOptions` y `categoryOptions`
- **EditProductDialog**: recibe `uomOptions` y `categoryOptions` 
- **NewMovementDialog**: recibe `movementTypeOptions`
- **ImportProductsDialog**: recibe `categoryOptions` para plantilla CSV

#### ✅ Módulo Órdenes de Trabajo
- **PrioritySelect**: recibe `options` y mapea iconos/colores
- **NewOTDialog**: recibe `prioridadOptions` y `acabadoOptions`
- **EditHeaderDialog**: recibe `prioridadOptions` y `acabadoOptions`

#### ✅ Páginas Server-Side
- `/inventario`: fetches `UNIDAD_MEDIDA`, `CATEGORIA_PRODUCTO`, `TIPO_MOVIMIENTO`
- `/ot`: fetches `PRIORIDAD_OT`, `TIPO_ACABADO`  
- `/ot/[id]`: fetches `PRIORIDAD_OT`, `TIPO_ACABADO`

## Catálogos Implementados

### Inventario
- **UNIDAD_MEDIDA**: 23 unidades (pz, kg, m, etc.)
- **CATEGORIA_PRODUCTO**: 5 categorías (Materia Prima, Herramientas, etc.)
- **TIPO_MOVIMIENTO**: 4 tipos (Ingreso/Salida por compra/ajuste/OT)

### Órdenes de Trabajo  
- **PRIORIDAD_OT**: 4 niveles (Baja, Media, Alta, Urgente)
- **TIPO_ACABADO**: 6 opciones (Ninguno, Zincado, Tropicalizado, etc.)
- **ESTADO_OT**: 5 estados (Borrador, Planificada, En Progreso, etc.)

### Máquinas
- **ESTADO_MAQUINA**: 3 estados (Activa, Mantenimiento, Baja)
- **EVENTO_MAQUINA**: 5 tipos (Uso, Paro, Mantenimiento, etc.)

### Compras y Cotizaciones
- **ESTADO_SC**: 5 estados de solicitudes de compra
- **ESTADO_OC**: 6 estados de órdenes de compra  
- **ESTADO_COTIZACION**: 5 estados de cotizaciones

## Scripts de Seed

### TypeScript (recomendado)
```bash
npx tsx prisma/scripts/seed-catalogos.ts
```

### SQL directo
```bash
psql -d tu_database -f prisma/scripts/seed-catalogos.sql
```

## Administración

### Interfaz Admin
Visita `/admin/catalogos` para:
- ✏️ Editar etiquetas y colores
- ➕ Agregar nuevos valores
- 🔄 Reordenar opciones  
- ❌ Desactivar opciones obsoletas

### Vía Código
```typescript
// Agregar nueva opción
await prisma.configuracionCatalogo.create({
  data: {
    tipo: 'PRIORIDAD_OT',
    codigo: 'CRITICAL',
    nombre: 'Crítica',
    orden: 5,
    color: '#DC2626',
    icono: 'AlertTriangle'
  }
});
```

## Migración Completada

### ✅ Archivos Eliminados
- `src/app/(protected)/inventario/uoms.ts`

### ✅ Archivos Marcados como Obsoletos  
- `src/components/ot/acabado-constants.tsx` (solo comentario)

### ✅ Componentes Migrados
- Inventario: diálogos de productos y movimientos
- OT: selectores de prioridad y acabado
- UI: componentes Badge con soporte de catálogo

### ✅ Páginas Server Actualizadas
- Todas las páginas principales fetchean opciones de catálogo
- Props pasadas correctamente a componentes cliente

## Beneficios Obtenidos

1. **🎯 Single Source of Truth**: Un solo lugar para todas las opciones
2. **🔄 Flexibilidad**: Cambios sin redeployment de código
3. **🎨 UI Consistente**: Colores e iconos centralizados  
4. **📊 Admin Friendly**: Interfaz gráfica para gestión
5. **🧪 Testeable**: Mocking simplificado en tests
6. **📈 Escalable**: Fácil agregar nuevos tipos de catálogo

## Patrones para Nuevos Componentes

### 1. Componente con Catálogo
```typescript
interface Props {
  // Props del catálogo (siempre opcionales con fallback)
  priorities?: { value: string; label: string; color?: string }[];
}

function MyComponent({ priorities = [] }: Props) {
  // Usar options del catálogo
  return priorities.map(p => <Option key={p.value} {...p} />);
}
```

### 2. Página Server que usa Catálogo
```typescript
export default async function MyPage() {
  // Fetch opciones del catálogo
  const priorities = await getCatalogoOptions('PRIORIDAD_OT');
  
  return <MyClient priorities={priorities} />;
}
```

### 3. Mapeo con Iconos/Colores Locales
```typescript
const mappedOptions = catalogOptions.map(option => ({
  ...option,
  icon: iconMap[option.value] || DefaultIcon,
  className: colorMap[option.value] || 'text-gray-500'
}));
```

## Próximos Pasos

1. **🔍 Monitorear**: Revisar logs de admin para cambios frecuentes
2. **🚀 Optimizar**: Implementar cache Redis si el volumen crece
3. **📋 Validar**: Crear validaciones Zod basadas en catálogos actuales
4. **🌍 i18n**: Agregar soporte multiidioma en `configuracionCatalogo`

---

**Nota**: Este sistema mantiene compatibilidad hacia atrás. Los componentes funcionan tanto con options del catálogo como con arrays hardcodeados (fallback).