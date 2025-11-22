# 🛠️ Gestor de Herramientas - Scripts

## Scripts disponibles

### 1. `init-tool-stock.ts` - Inicializar Stock de Herramientas

Crea automáticamente 100 unidades de stock + 100 instancias de herramientas para TODAS las herramientas del sistema.

```bash
pnpm tsx scripts/init-tool-stock.ts
```

**¿Qué hace?**
- Busca todos los productos con categoría `HERRAMIENTA` o `HERRAMIENTA_CORTE`
- Para cada uno:
  - ✅ Crea 100 unidades de stock (movimiento `INGRESO_AJUSTE`)
  - ✅ Crea 100 registros `ToolInstance` con códigos secuenciales
  - ✅ Cada código sigue el formato: `SKU-000001`, `SKU-000002`, etc.
  - ✅ Asigna estado `NUEVA` y ubicación `Almacén`

**Resultado:**
```
✅ HC-001 (Fresa 10mm) - Stock: 100 unidades + 100 ToolInstance creadas
   HC-001-000001 (NUEVA, Almacén)
   HC-001-000002 (NUEVA, Almacén)
   ...
   HC-001-000100 (NUEVA, Almacén)
```

---

### 2. `create-tool-instances.ts` - Crear Instancias desde Stock Existente

Crea automáticamente registros `ToolInstance` para herramientas que ya tienen stock registrado.

```bash
pnpm tsx scripts/create-tool-instances.ts
```

**¿Qué hace?**
- Busca todas las herramientas con stock registrado en `Movimiento`
- Para cada una, verifica cuántas instancias ya existen
- Crea las instancias faltantes para completar el stock
- Genera códigos secuenciales: `SKU-000001`, `SKU-000002`, etc.

**Ejemplo:**
```
Si HC-001 tiene 100 de stock pero 0 ToolInstance:
  ✅ HC-001 - Creadas 100 instancias (total: 100)
     HC-001-000001 (NUEVA, Almacén)
     HC-001-000002 (NUEVA, Almacén)
     ...
     HC-001-000100 (NUEVA, Almacén)
```

---

### 3. `update-tool-codes.ts` - Actualizar Códigos Existentes

Actualiza todos los códigos de herramientas existentes al formato secuencial.

```bash
pnpm tsx scripts/update-tool-codes.ts
```

**¿Qué hace?**
- Lee todas las instancias de herramientas existentes
- Ordena por producto y fecha de creación
- Regenera códigos en formato: `SKU-000001`, `SKU-000002`, etc.
- Ignora si el código ya es correcto (no duplica trabajo)

**Ejemplo de transformación:**
```
HC-001-1734899456123-1 → HC-001-000001
HC-001-1734899456123-2 → HC-001-000002
TC-005-1734899456123-1 → TC-005-000001
```

---

### 4. `verify-tool-codes.ts` - Verificar Códigos

Muestra un resumen visual de todas las herramientas registradas.

```bash
pnpm tsx scripts/verify-tool-codes.ts
```

**Salida:**
```
🔍 Verificando códigos de herramientas...

📦 Producto: HC-001 (Fresa 10mm)
  ✨ HC-001-000001 - Estado: NUEVA - Costo: $10.00
  ✨ HC-001-000002 - Estado: NUEVA - Costo: $10.00
  ...
  ⚙️  HC-001-000100 - Estado: EN_USO - Costo: $10.00

📦 Producto: TC-005 (Plaquita Carburo)
  ✨ TC-005-000001 - Estado: NUEVA - Costo: $15.00
  ...

============================================================
📊 RESUMEN POR PRODUCTO:
============================================================
  HC-001: 100 herramientas
  TC-005: 50 herramientas

Total de productos: 2
Total de herramientas: 150
============================================================
```

---

### 5. `manage-tools.ts` - Menú Maestro (Opcional)

Ejecuta cualquiera de los scripts anteriores desde un menú interactivo.

```bash
# Mostrar menú
pnpm tsx scripts/manage-tools.ts

# Ejecutar script específico directamente
pnpm tsx scripts/manage-tools.ts 1  # init-tool-stock
pnpm tsx scripts/manage-tools.ts 2  # create-tool-instances
pnpm tsx scripts/manage-tools.ts 3  # update-tool-codes
pnpm tsx scripts/manage-tools.ts 4  # verify-tool-codes
```

---

## 📋 Flujo Recomendado

### Primera vez (Fresh Setup):
```bash
# 1. Si no hay stock, inicializar
pnpm tsx scripts/init-tool-stock.ts

# O si ya hay stock, crear instancias
pnpm tsx scripts/create-tool-instances.ts

# 2. Verificar que todo sea correcto
pnpm tsx scripts/verify-tool-codes.ts
```

### Después de cambios:
```bash
# Si hay códigos antiguos, actualizar formato
pnpm tsx scripts/update-tool-codes.ts

# Verificar resumen
pnpm tsx scripts/verify-tool-codes.ts
```

---

## 🎯 Formato de Códigos

Todos los códigos siguen el patrón:
```
[SKU]-[NÚMERO SECUENCIAL DE 6 DÍGITOS]

Ejemplos:
  HC-001-000001
  HC-001-000002
  HC-001-000100
  TC-005-000001
  TC-005-000050
```

**Ventajas:**
- ✅ Fácil de leer y memorizar
- ✅ Se puede imprimir en QR
- ✅ Secuencial por producto
- ✅ Escalable (hasta 999,999 herramientas por SKU)

---

## ⚠️ Notas Importantes

1. **Duplicados**: Los scripts validan para evitar crear códigos duplicados
2. **Base de datos**: Se recomienda hacer backup antes de ejecutar scripts de inicialización
3. **Performance**: Si tienes miles de herramientas, los scripts pueden tardar
4. **Transacciones**: Cada script usa transacciones para garantizar consistencia

---

## 🐛 Troubleshooting

### Error: "Producto no encontrado"
Asegúrate de que el producto existe y está clasificado como `HERRAMIENTA` o `HERRAMIENTA_CORTE`.

### Error: "El código ya existe"
Ejecuta `update-tool-codes.ts` para regenerar códigos únicos.

### Script lento
Es normal si tienes muchas herramientas. El proceso es seguro y se puede pausar/reanudar.

---

## 📊 Estadísticas útiles

Después de ejecutar `verify-tool-codes.ts`, obtendrás:
- Cantidad de productos (diferentes SKUs)
- Cantidad total de herramientas (instancias)
- Estado de cada herramienta (NUEVA, EN_USO, AFILADO, etc.)
- Costo de cada una

---

## ✅ Resultado Actual (22 Nov 2025)

Se ejecutó `create-tool-instances.ts` exitosamente:

```
✨ Proceso completado: 5700 instancias creadas

📊 RESUMEN:
  Total de productos: 57
  Total de herramientas: 5700
  Formato: SKU-000001 hasta SKU-000100 (por cada producto)
```

Cada herramienta está lista para:
- ✅ Montar en máquinas
- ✅ Registrar uso en OTs
- ✅ Rastrear desgaste
- ✅ Calcular costos por uso
