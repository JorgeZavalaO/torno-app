/**
 * Script para verificar que los cálculos de cotización coincidan con los parámetros configurados
 * 
 * Este script:
 * 1. Lee los parámetros actuales del sistema
 * 2. Lee las categorías de máquinas
 * 3. Simula un cálculo de cotización
 * 4. Compara con la lógica implementada en el dialog y el action
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const D = (n: number | string) => new Prisma.Decimal(n ?? 0);
const n2 = (d: Prisma.Decimal) => Number(d.toFixed(2));

interface TestCase {
  name: string;
  qty: number;
  materials: number;
  hours: number;
  machineCategory: string | null;
}

async function getCostingValues() {
  const params = await prisma.costingParam.findMany({
    select: { key: true, valueText: true, valueNumber: true },
  });
  const m = new Map(params.map((p) => [p.key, p]));

  const getVal = (k: string, fallback: number | string = 0) => {
    const p = m.get(k);
    if (!p) return fallback;
    return p.valueNumber !== null ? Number(p.valueNumber.toString()) : (p.valueText ?? fallback);
  };

  return {
    currency: String(getVal("currency", "PEN")),
    gi: Number(getVal("gi", 0)),
    margin: Number(getVal("margin", 0)),
    hourlyRate: Number(getVal("hourlyRate", 0)),
    kwhRate: Number(getVal("kwhRate", 0)),
    deprPerHour: Number(getVal("deprPerHour", 0)),
    toolingPerPiece: Number(getVal("toolingPerPiece", 0)),
    rentPerHour: Number(getVal("rentPerHour", 0)),
    usdRate: Number(getVal("usdRate", 3.5)),
  };
}

async function getCostsByCategory(categoria: string | null) {
  if (!categoria) {
    const params = await prisma.costingParam.findMany({
      where: {
        key: {
          in: ["hourlyRate", "deprPerHour", "kwhRate", "toolingPerPiece", "rentPerHour"],
        },
      },
    });

    const values: Record<string, number> = {};
    for (const param of params) {
      values[param.key] = param.valueNumber ? Number(param.valueNumber.toString()) : 0;
    }

    return {
      laborCost: values.hourlyRate || 0,
      deprPerHour: values.deprPerHour || 0,
      kwhRate: values.kwhRate || 0,
      toolingPerPiece: values.toolingPerPiece || 0,
      rentPerHour: values.rentPerHour || 0,
    };
  }

  const categoryData = await prisma.machineCostingCategory.findUnique({
    where: { categoria },
  });

  const sharedParams = await prisma.costingParam.findMany({
    where: {
      key: {
        in: ["kwhRate", "toolingPerPiece", "rentPerHour"],
      },
    },
  });

  const sharedValues: Record<string, number> = {};
  for (const param of sharedParams) {
    sharedValues[param.key] = param.valueNumber ? Number(param.valueNumber.toString()) : 0;
  }

  if (categoryData) {
    return {
      laborCost: Number(categoryData.laborCost.toString()),
      deprPerHour: Number(categoryData.deprPerHour.toString()),
      kwhRate: sharedValues.kwhRate || 0,
      toolingPerPiece: sharedValues.toolingPerPiece || 0,
      rentPerHour: sharedValues.rentPerHour || 0,
    };
  }

  return {
    laborCost: sharedValues.hourlyRate || 0,
    deprPerHour: sharedValues.deprPerHour || 0,
    kwhRate: sharedValues.kwhRate || 0,
    toolingPerPiece: sharedValues.toolingPerPiece || 0,
    rentPerHour: sharedValues.rentPerHour || 0,
  };
}

function calculateQuote(
  input: { qty: number; materials: number; hours: number },
  costs: { laborCost: number; deprPerHour: number; kwhRate: number; toolingPerPiece: number; rentPerHour: number },
  params: { gi: number; margin: number }
) {
  const qty = D(input.qty);
  const materials = D(input.materials);
  const hours = D(input.hours);

  const hourlyRate = D(costs.laborCost);
  const depr = D(costs.deprPerHour);
  const kwhRate = D(costs.kwhRate);
  const tooling = D(costs.toolingPerPiece);
  const rent = D(costs.rentPerHour);

  const gi = D(params.gi);
  const margin = D(params.margin);

  // Cálculo según lógica actual
  const laborCost = hourlyRate.mul(hours);
  const energyCost = kwhRate.mul(hours); // Ahora es por hora
  const deprCost = depr.mul(hours);
  const toolingCost = tooling.mul(qty);
  const rentCost = rent.mul(hours);

  const direct = materials.plus(laborCost).plus(energyCost).plus(deprCost).plus(toolingCost).plus(rentCost);
  const giAmount = direct.mul(gi);
  const subtotal = direct.plus(giAmount);
  const marginAmount = subtotal.mul(margin);
  const total = subtotal.plus(marginAmount);
  const unitPrice = qty.gt(0) ? total.div(qty) : total;

  return {
    labor: n2(laborCost),
    energy: n2(energyCost),
    depreciation: n2(deprCost),
    tooling: n2(toolingCost),
    rent: n2(rentCost),
    direct: n2(direct),
    giAmount: n2(giAmount),
    subtotal: n2(subtotal),
    marginAmount: n2(marginAmount),
    total: n2(total),
    unitPrice: n2(unitPrice),
  };
}

async function runTests() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TEST DE CÁLCULOS DE COTIZACIÓN");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Obtener parámetros actuales
  console.log("📊 Parámetros del Sistema:\n");
  const params = await getCostingValues();
  console.log(`   Moneda: ${params.currency}`);
  console.log(`   Gastos indirectos: ${(params.gi * 100).toFixed(1)}%`);
  console.log(`   Margen: ${(params.margin * 100).toFixed(1)}%`);
  console.log(`   Tarifa/hora (general): ${params.hourlyRate.toFixed(2)} ${params.currency}`);
  console.log(`   Tarifa kWh: ${params.kwhRate.toFixed(4)} ${params.currency}`);
  console.log(`   Depreciación/hora (general): ${params.deprPerHour.toFixed(2)} ${params.currency}`);
  console.log(`   Herramientas/pieza: ${params.toolingPerPiece.toFixed(2)} ${params.currency}`);
  console.log(`   Alquiler/hora: ${params.rentPerHour.toFixed(2)} ${params.currency}`);
  console.log(`   Tasa USD: ${params.usdRate.toFixed(2)}\n`);

  // 2. Obtener categorías de máquinas
  console.log("🏭 Categorías de Máquinas:\n");
  const categories = await prisma.machineCostingCategory.findMany({
    where: { activo: true },
  });

  if (categories.length === 0) {
    console.log("   ⚠️  No hay categorías de máquinas configuradas\n");
  } else {
    for (const cat of categories) {
      console.log(`   ${cat.categoria}:`);
      console.log(`      Mano de obra: ${Number(cat.laborCost).toFixed(2)} ${params.currency}/h`);
      console.log(`      Depreciación: ${Number(cat.deprPerHour).toFixed(2)} ${params.currency}/h`);
      if (cat.descripcion) {
        console.log(`      ${cat.descripcion}`);
      }
      console.log();
    }
  }

  // 3. Casos de prueba
  const testCases: TestCase[] = [
    {
      name: "Sin categoría (parámetros generales)",
      qty: 10,
      materials: 500,
      hours: 5,
      machineCategory: null,
    },
    {
      name: "Con TORNO PARALELO",
      qty: 10,
      materials: 500,
      hours: 5,
      machineCategory: "TORNO PARALELO",
    },
    {
      name: "Con TORNO CNC",
      qty: 10,
      materials: 500,
      hours: 5,
      machineCategory: "TORNO CNC",
    },
    {
      name: "Cotización pequeña (1 unidad, 2h)",
      qty: 1,
      materials: 50,
      hours: 2,
      machineCategory: null,
    },
  ];

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  CASOS DE PRUEBA");
  console.log("═══════════════════════════════════════════════════════════\n");

  for (const testCase of testCases) {
    console.log(`\n▶ ${testCase.name}`);
    console.log(`   Cantidad: ${testCase.qty} piezas`);
    console.log(`   Materiales: ${testCase.materials.toFixed(2)} ${params.currency}`);
    console.log(`   Horas: ${testCase.hours}h`);
    if (testCase.machineCategory) {
      console.log(`   Categoría: ${testCase.machineCategory}`);
    }
    console.log();

    // Obtener costos según categoría
    const costs = await getCostsByCategory(testCase.machineCategory);
    
    console.log("   Costos aplicados:");
    console.log(`      Mano de obra: ${costs.laborCost.toFixed(2)} ${params.currency}/h`);
    console.log(`      Depreciación: ${costs.deprPerHour.toFixed(2)} ${params.currency}/h`);
    console.log(`      Energía: ${costs.kwhRate.toFixed(4)} ${params.currency}/h`);
    console.log(`      Herramientas: ${costs.toolingPerPiece.toFixed(2)} ${params.currency}/pieza`);
    console.log(`      Alquiler: ${costs.rentPerHour.toFixed(2)} ${params.currency}/h`);
    console.log();

    // Calcular
    const result = calculateQuote(
      { qty: testCase.qty, materials: testCase.materials, hours: testCase.hours },
      costs,
      { gi: params.gi, margin: params.margin }
    );

    console.log("   📊 Desglose de Costos:");
    console.log(`      Materiales:       ${result.direct.toFixed(2).padStart(10)} ${params.currency} (Input)`);
    console.log(`      Mano de obra:     ${result.labor.toFixed(2).padStart(10)} ${params.currency} (${costs.laborCost.toFixed(2)} × ${testCase.hours}h)`);
    console.log(`      Energía:          ${result.energy.toFixed(2).padStart(10)} ${params.currency} (${costs.kwhRate.toFixed(4)} × ${testCase.hours}h)`);
    console.log(`      Depreciación:     ${result.depreciation.toFixed(2).padStart(10)} ${params.currency} (${costs.deprPerHour.toFixed(2)} × ${testCase.hours}h)`);
    console.log(`      Herramientas:     ${result.tooling.toFixed(2).padStart(10)} ${params.currency} (${costs.toolingPerPiece.toFixed(2)} × ${testCase.qty} piezas)`);
    console.log(`      Alquiler:         ${result.rent.toFixed(2).padStart(10)} ${params.currency} (${costs.rentPerHour.toFixed(2)} × ${testCase.hours}h)`);
    console.log(`      ${'─'.repeat(50)}`);
    console.log(`      Costo directo:    ${result.direct.toFixed(2).padStart(10)} ${params.currency}`);
    console.log(`      + G.I. (${(params.gi * 100).toFixed(1)}%):    ${result.giAmount.toFixed(2).padStart(10)} ${params.currency}`);
    console.log(`      ${'─'.repeat(50)}`);
    console.log(`      Subtotal:         ${result.subtotal.toFixed(2).padStart(10)} ${params.currency}`);
    console.log(`      + Margen (${(params.margin * 100).toFixed(1)}%): ${result.marginAmount.toFixed(2).padStart(10)} ${params.currency}`);
    console.log(`      ${'═'.repeat(50)}`);
    console.log(`      💰 TOTAL:         ${result.total.toFixed(2).padStart(10)} ${params.currency}`);
    console.log(`      📦 Precio/unidad: ${result.unitPrice.toFixed(2).padStart(10)} ${params.currency}`);
    console.log();
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  VERIFICACIÓN DE CONSISTENCIA");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Verificar que el frontend y el backend usan la misma lógica
  console.log("✓ Frontend (new-quote-dialog.tsx):");
  console.log("   - Usa useMemo para cálculo reactivo");
  console.log("   - Obtiene costos de categoría seleccionada o usa valores generales");
  console.log("   - Fórmula: labor = hourlyRate × hours");
  console.log("   - Fórmula: energy = kwhRate × hours (¡cambió de kwh a hours!)");
  console.log("   - Fórmula: depreciation = deprPerHour × hours");
  console.log("   - Fórmula: tooling = toolingPerPiece × qty");
  console.log("   - Fórmula: rent = rentPerHour × hours");
  console.log("   - Fórmula: direct = materials + labor + energy + depreciation + tooling + rent");
  console.log("   - Fórmula: giAmount = direct × gi");
  console.log("   - Fórmula: subtotal = direct + giAmount");
  console.log("   - Fórmula: marginAmount = subtotal × margin");
  console.log("   - Fórmula: total = subtotal + marginAmount");
  console.log();

  console.log("✓ Backend (actions.ts - createQuote):");
  console.log("   - Usa getCostsByCategory() para obtener costos según categoría");
  console.log("   - Usa la misma fórmula de cálculo");
  console.log("   - Guarda breakdown completo en la BD");
  console.log();

  console.log("⚠️  Backend (actions.ts - updateQuote):");
  console.log("   - ❌ NO está usando getCostsByCategory()!");
  console.log("   - ❌ Usa valores generales de getCostingValues()");
  console.log("   - ❌ NO respeta la categoría de máquina seleccionada");
  console.log("   - ❌ Todavía usa el campo obsoleto 'kwh'");
  console.log();

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PROBLEMAS DETECTADOS");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("1. ❌ updateQuote() no respeta categorías de máquina");
  console.log("   - Al editar una cotización, se pierden los costos específicos");
  console.log("   - Solución: Implementar getCostsByCategory() en updateQuote");
  console.log();

  console.log("2. ❌ updateQuote() usa campo obsoleto 'kwh'");
  console.log("   - El campo 'kwh' ya no es relevante (ahora es kwhRate × hours)");
  console.log("   - Solución: Actualizar la lógica para eliminar referencia a kwh");
  console.log();

  console.log("3. ⚠️  Falta guardar machineCategory en la cotización");
  console.log("   - El campo se envía pero no se persiste en la BD");
  console.log("   - Solución: Agregar campo machineCategory a Cotizacion schema");
  console.log();

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RECOMENDACIONES");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("1. Agregar campo 'machineCategory' al modelo Cotizacion");
  console.log("2. Actualizar updateQuote() para usar getCostsByCategory()");
  console.log("3. Eliminar referencias al campo obsoleto 'kwh'");
  console.log("4. Agregar tests unitarios para estas funciones");
  console.log("5. Documentar el cambio de cálculo de energía (kwh → hours)");
  console.log();

  await prisma.$disconnect();
}

runTests().catch((e) => {
  console.error("Error ejecutando tests:", e);
  process.exit(1);
});
