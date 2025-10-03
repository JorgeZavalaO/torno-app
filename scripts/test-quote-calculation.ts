/**
 * Script para probar el cálculo de cotizaciones
 * Valida que todos los parámetros estén presentes y los cálculos sean correctos
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Helper para convertir Decimal a número
const D = (val: string | number | Prisma.Decimal) => new Prisma.Decimal(val.toString());
const n2 = (d: Prisma.Decimal) => Number(d.toFixed(2));

async function testQuoteCalculation() {
  console.log("🧪 Iniciando prueba de cálculo de cotizaciones...\n");

  // 1. Verificar que todos los parámetros existan
  console.log("📋 Paso 1: Verificando parámetros...");
  
  const requiredParams = [
    "currency",
    "gi",
    "margin",
    "hourlyRate",
    "deprPerHour",
    "kwhRate",
    "toolingPerPiece",
    "rentPerHour",
  ];

  const params = await prisma.costingParam.findMany({
    where: {
      key: { in: requiredParams },
    },
  });

  const foundKeys = new Set(params.map(p => p.key));
  const missingParams = requiredParams.filter(k => !foundKeys.has(k));

  if (missingParams.length > 0) {
    console.error("❌ Faltan parámetros:", missingParams);
    console.log("\n🔧 Creando parámetros faltantes...");
    
    const defaults: Record<string, { label: string; group: string; type: "CURRENCY" | "NUMBER" | "PERCENT" | "TEXT"; valueNumber?: string; valueText?: string; unit?: string }> = {
      hourlyRate: {
        label: "Costo de mano de obra por hora",
        group: "costos_compartidos",
        type: "CURRENCY" as const,
        valueNumber: "4.00",
        unit: "USD/hora",
      },
      deprPerHour: {
        label: "Depreciación de máquina por hora",
        group: "costos_compartidos",
        type: "CURRENCY" as const,
        valueNumber: "1.50",
        unit: "USD/hora",
      },
    };

    for (const key of missingParams) {
      if (defaults[key]) {
        await prisma.costingParam.create({
          data: {
            key,
            ...defaults[key],
            valueNumber: defaults[key].valueNumber ? new Prisma.Decimal(defaults[key].valueNumber!) : null,
          },
        });
        console.log(`✅ Creado: ${key}`);
      }
    }
    
    // Re-fetch params
    const updatedParams = await prisma.costingParam.findMany({
      where: { key: { in: requiredParams } },
    });
    params.length = 0;
    params.push(...updatedParams);
  } else {
    console.log("✅ Todos los parámetros existen");
  }

  // 2. Construir valores
  console.log("\n📊 Paso 2: Obteniendo valores de parámetros...");
  
  const values: Record<string, string | number> = {};
  for (const param of params) {
    if (param.type === "TEXT") {
      values[param.key] = param.valueText ?? "";
    } else {
      values[param.key] = param.valueNumber ? Number(param.valueNumber.toString()) : 0;
    }
  }

  console.log("Parámetros actuales:");
  console.log(`  - Currency: ${values.currency}`);
  console.log(`  - GI: ${(Number(values.gi) * 100).toFixed(2)}%`);
  console.log(`  - Margin: ${(Number(values.margin) * 100).toFixed(2)}%`);
  console.log(`  - Hourly Rate: $${Number(values.hourlyRate).toFixed(2)}/h`);
  console.log(`  - Depreciation: $${Number(values.deprPerHour).toFixed(2)}/h`);
  console.log(`  - kWh Rate: $${Number(values.kwhRate).toFixed(2)}/h`);
  console.log(`  - Tooling: $${Number(values.toolingPerPiece).toFixed(2)}/piece`);
  console.log(`  - Rent: $${Number(values.rentPerHour).toFixed(2)}/h`);

  // 3. Simular una cotización
  console.log("\n💰 Paso 3: Simulando cálculo de cotización...");
  console.log("Datos de entrada:");
  
  const input = {
    qty: 10,        // 10 piezas
    materials: 50,  // $50 en materiales
    hours: 5,       // 5 horas de trabajo
  };

  console.log(`  - Cantidad: ${input.qty} piezas`);
  console.log(`  - Materiales: $${input.materials}`);
  console.log(`  - Horas: ${input.hours}h`);

  // 4. Ejecutar cálculo (mismo que en actions.ts)
  const gi = D(values.gi ?? 0);
  const margin = D(values.margin ?? 0);
  const hourlyRate = D(values.hourlyRate ?? 0);
  const kwhRate = D(values.kwhRate ?? 0);
  const depr = D(values.deprPerHour ?? 0);
  const tooling = D(values.toolingPerPiece ?? 0);
  const rent = D(values.rentPerHour ?? 0);

  const qty = D(input.qty);
  const materials = D(input.materials);
  const hours = D(input.hours);

  console.log("\n🔢 Cálculos detallados:");

  const laborCost = hourlyRate.mul(hours);
  console.log(`  1. Mano de obra = $${hourlyRate} × ${hours}h = $${n2(laborCost)}`);

  const energyCost = kwhRate.mul(hours);
  console.log(`  2. Energía = $${kwhRate} × ${hours}h = $${n2(energyCost)}`);

  const deprCost = depr.mul(hours);
  console.log(`  3. Depreciación = $${depr} × ${hours}h = $${n2(deprCost)}`);

  const toolingCost = tooling.mul(qty);
  console.log(`  4. Herramientas = $${tooling} × ${qty} piezas = $${n2(toolingCost)}`);

  const rentCost = rent.mul(hours);
  console.log(`  5. Alquiler = $${rent} × ${hours}h = $${n2(rentCost)}`);

  const direct = materials.plus(laborCost).plus(energyCost).plus(deprCost).plus(toolingCost).plus(rentCost);
  console.log(`  6. Costo Directo = $${input.materials} + $${n2(laborCost)} + $${n2(energyCost)} + $${n2(deprCost)} + $${n2(toolingCost)} + $${n2(rentCost)} = $${n2(direct)}`);

  const giAmount = direct.mul(gi);
  console.log(`  7. Gastos Indirectos (${(Number(gi) * 100).toFixed(0)}%) = $${n2(direct)} × ${gi} = $${n2(giAmount)}`);

  const subtotal = direct.plus(giAmount);
  console.log(`  8. Subtotal = $${n2(direct)} + $${n2(giAmount)} = $${n2(subtotal)}`);

  const marginAmount = subtotal.mul(margin);
  console.log(`  9. Margen (${(Number(margin) * 100).toFixed(0)}%) = $${n2(subtotal)} × ${margin} = $${n2(marginAmount)}`);

  const total = subtotal.plus(marginAmount);
  console.log(` 10. TOTAL = $${n2(subtotal)} + $${n2(marginAmount)} = $${n2(total)}`);

  const unitPrice = qty.gt(0) ? total.div(qty) : total;
  console.log(` 11. Precio Unitario = $${n2(total)} ÷ ${qty} = $${n2(unitPrice)}`);

  // 5. Validaciones
  console.log("\n✅ Paso 4: Validaciones...");

  const validations = [
    { name: "Mano de obra > 0", pass: laborCost.gt(0), value: n2(laborCost) },
    { name: "Depreciación > 0", pass: deprCost.gt(0), value: n2(deprCost) },
    { name: "Energía > 0", pass: energyCost.gt(0), value: n2(energyCost) },
    { name: "Herramientas > 0", pass: toolingCost.gt(0), value: n2(toolingCost) },
    { name: "Alquiler > 0", pass: rentCost.gt(0), value: n2(rentCost) },
    { name: "Costo directo > materiales", pass: direct.gt(materials), value: `$${n2(direct)} > $${input.materials}` },
    { name: "Total > costo directo", pass: total.gt(direct), value: `$${n2(total)} > $${n2(direct)}` },
  ];

  let allPassed = true;
  for (const validation of validations) {
    if (validation.pass) {
      console.log(`  ✅ ${validation.name}: $${validation.value}`);
    } else {
      console.log(`  ❌ ${validation.name}: $${validation.value}`);
      allPassed = false;
    }
  }

  // 6. Resumen final
  console.log("\n" + "=".repeat(60));
  if (allPassed) {
    console.log("✅ PRUEBA EXITOSA - Todos los cálculos son correctos");
    console.log("\nResumen de la cotización:");
    console.log(`  • Cantidad: ${input.qty} piezas`);
    console.log(`  • Total: $${n2(total)}`);
    console.log(`  • Precio unitario: $${n2(unitPrice)}/pieza`);
    console.log(`  • Desglose:`);
    console.log(`    - Materiales: $${input.materials} (${((input.materials / n2(total)) * 100).toFixed(1)}%)`);
    console.log(`    - Mano de obra: $${n2(laborCost)} (${((n2(laborCost) / n2(total)) * 100).toFixed(1)}%)`);
    console.log(`    - Energía: $${n2(energyCost)} (${((n2(energyCost) / n2(total)) * 100).toFixed(1)}%)`);
    console.log(`    - Depreciación: $${n2(deprCost)} (${((n2(deprCost) / n2(total)) * 100).toFixed(1)}%)`);
    console.log(`    - Herramientas: $${n2(toolingCost)} (${((n2(toolingCost) / n2(total)) * 100).toFixed(1)}%)`);
    console.log(`    - Alquiler: $${n2(rentCost)} (${((n2(rentCost) / n2(total)) * 100).toFixed(1)}%)`);
    console.log(`    - GI: $${n2(giAmount)} (${((n2(giAmount) / n2(total)) * 100).toFixed(1)}%)`);
    console.log(`    - Margen: $${n2(marginAmount)} (${((n2(marginAmount) / n2(total)) * 100).toFixed(1)}%)`);
  } else {
    console.log("❌ PRUEBA FALLIDA - Algunos cálculos no son correctos");
  }
  console.log("=".repeat(60));

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

testQuoteCalculation().catch((error) => {
  console.error("Error ejecutando la prueba:", error);
  process.exit(1);
});
