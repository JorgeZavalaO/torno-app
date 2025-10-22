# 🏗️ Arquitectura de Costos del Sistema

## 📋 Resumen Ejecutivo

El sistema de costos está diseñado con **DOS NIVELES DE PARÁMETROS**:

1. **CostingParam** (Parámetros Generales): Costos compartidos que aplican a TODAS las categorías
2. **MachineCostingCategory** (Parámetros por Categoría): Costos específicos por tipo de máquina

**✅ NO HAY REDUNDANCIA** - Cada parámetro tiene una función específica y diferente.

---

## 🎯 Arquitectura de Dos Niveles

```
┌─────────────────────────────────────────────────────────────┐
│                    CÁLCULO DE COTIZACIÓN                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌────────────────────┐                  ┌─────────────────────┐
│  CostingParam      │                  │ MachineCostingCat.  │
│  (Compartidos)     │                  │ (Por Categoría)     │
├────────────────────┤                  ├─────────────────────┤
│ • currency         │                  │ • laborCost         │
│ • usdRate          │                  │ • deprPerHour       │
│ • gi (15%)         │                  │ • categoria         │
│ • margin (20%)     │                  │ • descripcion       │
│ • kwhRate          │                  └─────────────────────┘
│ • toolingPerPiece  │                           │
│ • rentPerHour      │                           │
└────────────────────┘                           │
         │                                       │
         └───────────────┬───────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  getCostsByCategory  │
              │  (Fusiona ambos)     │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Objeto Unificado   │
              │   de Costos          │
              └──────────────────────┘
```

---

## 📊 Tabla Comparativa: CostingParam vs MachineCostingCategory

| Característica | CostingParam | MachineCostingCategory |
|----------------|--------------|------------------------|
| **Propósito** | Costos compartidos | Costos específicos |
| **Alcance** | TODAS las categorías | UNA categoría |
| **Ejemplos** | Electricidad, herramientas, alquiler | Mano de obra, depreciación |
| **Variación** | Igual para todos | Diferente por categoría |
| **Modelo de Datos** | key-value flexible | Estructura fija |
| **UI** | Tab "Parámetros" | Tab "Categorías" |
| **Cantidad** | 7 parámetros | N categorías (2 por defecto) |

---

## 🔍 Análisis Detallado de Cada Parámetro

### 1. CostingParam - Parámetros COMPARTIDOS

Estos parámetros **NO VARÍAN** según el tipo de máquina:

#### **Grupo: general**
```typescript
currency: "USD"          // Moneda base del sistema
usdRate: 3.50           // Tipo de cambio USD → PEN (3.50 PEN = 1 USD)
```

#### **Grupo: margenes**
```typescript
gi: 0.15                // Gastos indirectos 15% (administración, ventas, etc.)
margin: 0.20            // Margen de utilidad 20% (ganancia)
```

#### **Grupo: costos_compartidos**
```typescript
kwhRate: 0.71           // Costo de electricidad USD/hora
                        // ✅ IGUAL para PARALELO y CNC
                        // Justificación: El costo de kWh es el mismo del proveedor

toolingPerPiece: 2.50   // Desgaste de herramientas USD/pieza
                        // ✅ IGUAL para ambos tipos
                        // Justificación: Herramientas similares en ambos tornos

rentPerHour: 10.00      // Alquiler de espacio USD/hora
                        // ✅ IGUAL para ambos tipos
                        // Justificación: El espacio que ocupan es similar
```

**¿Por qué están separados?**
- Se configuran UNA SOLA VEZ y aplican a todas las categorías
- Facilita mantenimiento (cambiar una vez, afecta a todos)
- Evita duplicación de datos

---

### 2. MachineCostingCategory - Parámetros POR CATEGORÍA

Estos parámetros **SÍ VARÍAN** según el tipo de máquina:

#### **TORNO PARALELO**
```typescript
categoria: "TORNO PARALELO"
laborCost: 3.43         // USD/hora (12.00 PEN/h ÷ 3.50)
deprPerHour: 0.09       // USD/hora (0.30 PEN/h ÷ 3.50)
```

**Justificación:**
- Operador menos especializado → menor costo de mano de obra
- Máquina más antigua/barata → menor depreciación

#### **TORNO CNC**
```typescript
categoria: "TORNO CNC"
laborCost: 5.43         // USD/hora (19.00 PEN/h ÷ 3.50)
deprPerHour: 0.46       // USD/hora (1.60 PEN/h ÷ 3.50)
```

**Justificación:**
- Operador especializado en CNC → mayor costo de mano de obra
- Máquina más moderna/cara → mayor depreciación

**¿Por qué están separados?**
- Permiten costos diferenciados por categoría
- Flexibilidad para agregar más categorías (FRESADORA, RECTIFICADORA, etc.)
- Refleja la realidad del negocio (máquinas diferentes = costos diferentes)

---

## 🔄 Flujo de Cálculo en Cotizaciones

### Paso 1: Usuario selecciona categoría de máquina
```typescript
input.machineCategory = "TORNO CNC";
```

### Paso 2: Sistema obtiene parámetros compartidos
```typescript
const v = await getCostingValues();
// Retorna: { currency, gi, margin, kwhRate, toolingPerPiece, rentPerHour }
```

### Paso 3: Sistema obtiene costos específicos de la categoría
```typescript
const categoryCosts = await getCostsByCategory("TORNO CNC");
// Retorna: { laborCost: 5.43, deprPerHour: 0.46, ...compartidos }
```

### Paso 4: Cálculo de costos directos
```typescript
const laborCost = categoryCosts.laborCost * hours;      // Específico
const energyCost = categoryCosts.kwhRate * hours;       // Compartido
const deprCost = categoryCosts.deprPerHour * hours;     // Específico
const toolingCost = categoryCosts.toolingPerPiece * qty; // Compartido
const rentCost = categoryCosts.rentPerHour * hours;     // Compartido

const direct = materials + laborCost + energyCost + deprCost + toolingCost + rentCost;
```

### Paso 5: Aplicar márgenes (compartidos)
```typescript
const giAmount = direct * categoryCosts.gi;           // Compartido
const subtotal = direct + giAmount;
const marginAmount = subtotal * categoryCosts.margin; // Compartido
const total = subtotal + marginAmount;
```

---

## 📈 Ejemplo Práctico: Cotización Real

**Datos de entrada:**
- Categoría: TORNO CNC
- Horas: 5 horas
- Cantidad: 100 piezas
- Materiales: $200 USD

**Costos Específicos (de MachineCostingCategory):**
```
Mano de obra:  $5.43/h × 5h = $27.15
Depreciación:  $0.46/h × 5h = $2.30
```

**Costos Compartidos (de CostingParam):**
```
Electricidad:  $0.71/h × 5h = $3.55
Herramientas:  $2.50/pz × 100 = $250.00
Alquiler:      $10.00/h × 5h = $50.00
```

**Costo Directo:**
```
$200.00 (materiales)
+ $27.15 (mano de obra) ← Específico
+ $2.30 (depreciación)  ← Específico
+ $3.55 (electricidad)  ← Compartido
+ $250.00 (herramientas) ← Compartido
+ $50.00 (alquiler)      ← Compartido
= $533.00
```

**Márgenes (compartidos):**
```
Gastos Indirectos (15%): $533.00 × 0.15 = $79.95
Subtotal: $533.00 + $79.95 = $612.95
Margen de Utilidad (20%): $612.95 × 0.20 = $122.59
TOTAL: $612.95 + $122.59 = $735.54
```

**Precio Unitario:** $735.54 ÷ 100 = **$7.36 por pieza**

---

## 🔧 Código de Integración

### Función `getCostsByCategory()`
```typescript
// src/app/server/queries/machine-costing-categories.ts

export async function getCostsByCategory(categoria: string | null) {
  // Obtener costos específicos de la categoría
  const categoryData = await getMachineCostingCategory(categoria);
  
  // Obtener parámetros compartidos
  const sharedParams = await prisma.costingParam.findMany({
    where: {
      key: { in: ["kwhRate", "toolingPerPiece", "rentPerHour", "gi", "margin"] }
    }
  });
  
  // Fusionar ambos
  return {
    laborCost: categoryData.laborCost,      // ← De MachineCostingCategory
    deprPerHour: categoryData.deprPerHour,  // ← De MachineCostingCategory
    kwhRate: sharedValues.kwhRate,          // ← De CostingParam
    toolingPerPiece: sharedValues.toolingPerPiece,  // ← De CostingParam
    rentPerHour: sharedValues.rentPerHour,  // ← De CostingParam
    gi: sharedValues.gi,                    // ← De CostingParam
    margin: sharedValues.margin             // ← De CostingParam
  };
}
```

---

## ❓ Preguntas Frecuentes

### **¿Por qué no poner todo en CostingParam?**
**R:** Porque entonces tendríamos:
- `laborCost_paralelo`
- `laborCost_cnc`
- `deprPerHour_paralelo`
- `deprPerHour_cnc`
- ❌ No escalable (cada nueva categoría = nuevos parámetros)
- ❌ Difícil de mantener
- ❌ Lógica de selección compleja

### **¿Por qué no poner todo en MachineCostingCategory?**
**R:** Porque entonces cada categoría tendría:
```typescript
categoria: "TORNO PARALELO"
laborCost: 3.43
deprPerHour: 0.09
kwhRate: 0.71        // ← Se repetiría en todas
toolingPerPiece: 2.50 // ← Se repetiría en todas
rentPerHour: 10.00   // ← Se repetiría en todas
gi: 0.15             // ← Se repetiría en todas
margin: 0.20         // ← Se repetiría en todas
```
- ❌ Duplicación de datos
- ❌ Inconsistencia (¿qué pasa si una categoría tiene gi diferente?)
- ❌ Difícil actualizar (cambiar gi = actualizar N categorías)

### **¿Es correcto tener ambos?**
**✅ SÍ - Es el diseño correcto por:**
1. **Separación de responsabilidades**: Compartidos vs específicos
2. **Escalabilidad**: Fácil agregar nuevas categorías
3. **Mantenibilidad**: Cambios compartidos en un solo lugar
4. **Normalización**: No hay duplicación de datos
5. **Flexibilidad**: Permite configuración granular

---

## 📊 Resumen Visual

```
╔══════════════════════════════════════════════════════════╗
║           CÁLCULO DE COSTO POR HORA                      ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  TORNO PARALELO:                                         ║
║    • Mano de obra: $3.43/h  ← MachineCostingCategory    ║
║    • Depreciación: $0.09/h  ← MachineCostingCategory    ║
║    • Electricidad: $0.71/h  ← CostingParam              ║
║    • Alquiler:    $10.00/h  ← CostingParam              ║
║    ─────────────────────────────────────────────         ║
║    TOTAL: ~$14.23 USD/hora                               ║
║                                                          ║
║  TORNO CNC:                                              ║
║    • Mano de obra: $5.43/h  ← MachineCostingCategory    ║
║    • Depreciación: $0.46/h  ← MachineCostingCategory    ║
║    • Electricidad: $0.71/h  ← CostingParam              ║
║    • Alquiler:    $10.00/h  ← CostingParam              ║
║    ─────────────────────────────────────────────         ║
║    TOTAL: ~$16.60 USD/hora                               ║
║                                                          ║
║  DIFERENCIA CNC vs PARALELO:                             ║
║    • Mano de obra: +$2.00/h (+58.3%)                     ║
║    • Depreciación: +$0.37/h (+411.1%)                    ║
║    • Compartidos:   $0.00/h (iguales)                    ║
║    ─────────────────────────────────────────────         ║
║    TOTAL: +$2.37/hora (+16.7%)                           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## ✅ Conclusión

### **¿Hay redundancia?**
❌ **NO** - No hay redundancia. Cada parámetro tiene una función específica:

- **CostingParam**: Costos que son **iguales** para todas las categorías
- **MachineCostingCategory**: Costos que **varían** según la categoría

### **¿Dónde se aplican?**

| Parámetro | Ubicación | Alcance | Uso |
|-----------|-----------|---------|-----|
| `currency` | CostingParam | Global | Moneda del sistema |
| `usdRate` | CostingParam | Global | Tipo de cambio |
| `gi` | CostingParam | Todas las categorías | Gastos indirectos 15% |
| `margin` | CostingParam | Todas las categorías | Margen de utilidad 20% |
| `kwhRate` | CostingParam | Todas las categorías | Costo electricidad |
| `toolingPerPiece` | CostingParam | Todas las categorías | Desgaste herramientas |
| `rentPerHour` | CostingParam | Todas las categorías | Alquiler espacio |
| `laborCost` | MachineCostingCategory | Por categoría | Mano de obra específica |
| `deprPerHour` | MachineCostingCategory | Por categoría | Depreciación específica |

### **¿Es el diseño correcto?**
✅ **SÍ** - Este es un patrón de diseño estándar:
- Cumple con principios SOLID (Single Responsibility)
- Normalización de base de datos (3FN)
- Patrón "Configuration + Override" (config general + específica)
- Similar a CSS (estilos globales + clases específicas)

---

**Fecha de documentación:** 2 de octubre de 2025  
**Autor:** GitHub Copilot  
**Estado:** ✅ Arquitectura Validada  
**Versión:** 1.0.0
