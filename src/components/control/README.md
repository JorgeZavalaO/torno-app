# Módulo de Control de Producción

Este módulo proporciona una interfaz completa para el monitoreo y control de la producción en el taller de tornería.

## Componentes

### 1. `ControlDashboard`
Componente principal que integra todas las funcionalidades del módulo de control.

**Props:**
- `canWrite: boolean` - Permisos de escritura del usuario
- `overview: Overview` - Datos de resumen de producción
- `quicklog: QuickLog` - Datos para registro rápido
- `actions: Actions` - Acciones del servidor
- `onRefresh?: () => void` - Función para refrescar datos

### 2. `KPIDashboard`
Panel de indicadores clave de rendimiento (KPIs).

**Características:**
- Métricas de horas trabajadas
- Estado de órdenes de trabajo
- Avance global de producción
- Comparación con tendencias

### 3. `ProductionCharts`
Gráficos interactivos para visualizar datos de producción.

**Gráficos incluidos:**
- Evolución temporal de horas trabajadas
- Distribución por máquinas (gráfico de torta)
- Ranking de operadores (gráfico de barras)
- Tabla de resumen de máquinas

### 4. `WIPTable`
Tabla avanzada para visualizar las órdenes de trabajo en proceso.

**Funcionalidades:**
- Filtrado por texto, estado y prioridad
- Ordenamiento por múltiples campos
- Indicadores de progreso visuales
- Estadísticas en tiempo real

### 5. `QuickRegistration`
Formularios optimizados para el registro rápido de producción.

**Formularios:**
- Registro de horas trabajadas
- Registro de piezas terminadas
- Validación en tiempo real
- Feedback visual de acciones

### 6. `RankingTabs`
Ranking detallado de máquinas y operadores.

**Características:**
- Gráficos de barras de progreso
- Iconos de ranking (trofeos, medallas)
- Tablas detalladas con porcentajes
- Estadísticas comparativas

## Tipos de Datos

### `Overview`
Datos principales del dashboard de producción:
```typescript
{
  series: SeriePoint[];      // Datos temporales
  machines: MachineRow[];    // Datos de máquinas
  operators: OperatorRow[];  // Datos de operadores
  wip: WIPRow[];            // Órdenes en proceso
  kpis: KPIMetrics;         // Métricas clave
  from: Date;               // Fecha de inicio
  until: Date;              // Fecha de fin
}
```

### `QuickLog`
Datos para registro rápido:
```typescript
{
  ots: QuickLogOT[];  // Órdenes disponibles para registro
}
```

### `Actions`
Acciones del servidor:
```typescript
{
  logProduction: (fd: FormData) => Promise<Result>;
  logFinishedPieces: (fd: FormData) => Promise<Result>;
}
```

## Mejoras Implementadas

### UX/UI
1. **Diseño Responsivo**: Adaptable a diferentes tamaños de pantalla
2. **Iconografía Consistente**: Uso de Lucide React para iconos uniformes
3. **Estados de Carga**: Indicadores visuales durante acciones
4. **Feedback Visual**: Toasts y badges informativos
5. **Colores Temáticos**: Esquema de colores coherente con el sistema

### Funcionalidad
1. **Filtrado Avanzado**: Múltiples criterios de filtrado en WIP
2. **Ordenamiento Dinámico**: Sorting por diferentes campos
3. **Validaciones**: Validación de formularios en tiempo real
4. **Manejo de Errores**: Gestión robusta de errores
5. **Optimización**: Memoización y optimizaciones de rendimiento

### Separación de Componentes
1. **Modularidad**: Cada funcionalidad en su propio componente
2. **Reutilización**: Componentes reutilizables entre diferentes módulos
3. **Mantenibilidad**: Código más fácil de mantener y extender
4. **Testing**: Estructura que facilita las pruebas unitarias

## Uso

```tsx
import { ControlDashboard } from '@/components/control';

export default function ControlPage() {
  return (
    <ControlDashboard
      canWrite={canWrite}
      overview={overview}
      quicklog={quicklog}
      actions={actions}
      onRefresh={handleRefresh}
    />
  );
}
```

## Dependencias

- **@radix-ui/react-progress**: Para barras de progreso
- **recharts**: Para gráficos interactivos
- **lucide-react**: Para iconos
- **sonner**: Para notificaciones toast
