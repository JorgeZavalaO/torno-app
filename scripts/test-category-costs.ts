/**
 * Script de prueba para validar que las cotizaciones usan categorías de máquina
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { getCostsByCategory } from "../src/app/server/queries/machine-costing-categories";

const prisma = new PrismaClient();

const D = (val: string | number | Prisma.Decimal) => new Prisma.Decimal(val.toString());
const n2 = (d: Prisma.Decimal) => Number(d.toFixed(2));

async function testCategoryBasedQuote() {
  console.log("🧪 Prueba de cotización con categorías de máquina\n");

  // 1. Listar categorías disponibles
  const categories = await prisma.machineCostingCategory.findMany({
    where: { activo: true },
  });

  console.log("📋 Categorías disponibles:");
  for (const cat of categories) {
    console.log(`  - ${cat.categoria}: Labor=$${Number(cat.laborCost)}/ h, Depr=$${Number(cat.deprPerHour)}/h`);
  }

  // 2. Probar con TORNO PARALELO
  console.log("\n💰 Prueba 1: TORNO PARALELO");
  const paraleloCosts = await getCostsByCategory("TORNO PARALELO");
  console.log("  Costos obtenidos:");
  console.log(`    - Labor: $${paraleloCosts.laborCost}/h`);
  console.log(`    - Depreciation: $${paraleloCosts.deprPerHour}/h`);

  const input1 = { qty: 10, materials: 100, hours: 5 };
  const calc1 = calculateQuote(input1, paraleloCosts);
  console.log(`  Input: ${input1.qty} pzs, $${input1.materials}, ${input1.hours}h`);
  console.log(`  Labor: $${calc1.labor} (${paraleloCosts.laborCost} × ${input1.hours})`);
  console.log(`  Depr: $${calc1.depreciation} (${paraleloCosts.deprPerHour} × ${input1.hours})`);
  console.log(`  TOTAL: $${calc1.total}`);

  // 3. Probar con TORNO CNC
  console.log("\n💰 Prueba 2: TORNO CNC");
  const cncCosts = await getCostsByCategory("TORNO CNC");
  console.log("  Costos obtenidos:");
  console.log(`    - Labor: $${cncCosts.laborCost}/h`);
  console.log(`    - Depreciation: $${cncCosts.deprPerHour}/h`);

  const input2 = { qty: 10, materials: 100, hours: 5 };
  const calc2 = calculateQuote(input2, cncCosts);
  console.log(`  Input: ${input2.qty} pzs, $${input2.materials}, ${input2.hours}h`);
  console.log(`  Labor: $${calc2.labor} (${cncCosts.laborCost} × ${input2.hours})`);
  console.log(`  Depr: $${calc2.depreciation} (${cncCosts.deprPerHour} × ${input2.hours})`);
  console.log(`  TOTAL: $${calc2.total}`);

  // 4. Comparar
  console.log("\n📊 Comparación:");
  console.log(`  PARALELO: Labor=$${calc1.labor}, Depr=$${calc1.depreciation}, Total=$${calc1.total}`);
  console.log(`  CNC:      Labor=$${calc2.labor}, Depr=$${calc2.depreciation}, Total=$${calc2.total}`);
  console.log(`  Diferencia: $${(calc2.total - calc1.total).toFixed(2)} (${(((calc2.total / calc1.total) - 1) * 100).toFixed(1)}% más caro)`);

  // 5. Validaciones
  console.log("\n✅ Validaciones:");
  const checks = [
    { name: "CNC labor > PARALELO labor", pass: calc2.labor > calc1.labor },
    { name: "CNC depr > PARALELO depr", pass: calc2.depreciation > calc1.depreciation },
    { name: "CNC total > PARALELO total", pass: calc2.total > calc1.total },
    { name: "Ambos labor > 0", pass: calc1.labor > 0 && calc2.labor > 0 },
    { name: "Ambos depr > 0", pass: calc1.depreciation > 0 && calc2.depreciation > 0 },
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    if (!check.pass) allPassed = false;
  }

  console.log("\n" + "=".repeat(60));
  if (allPassed) {
    console.log("✅ TODAS LAS PRUEBAS PASARON");
    console.log("El sistema diferencia correctamente los costos por categoría");
  } else {
    console.log("❌ ALGUNAS PRUEBAS FALLARON");
  }
  console.log("=".repeat(60));

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

function calculateQuote(
  input: { qty: number; materials: number; hours: number },
  costs: { laborCost: number; deprPerHour: number; kwhRate: number; toolingPerPiece: number; rentPerHour: number; gi: number; margin: number }
) {
  const gi = D(costs.gi);
  const margin = D(costs.margin);
  const qty = D(input.qty);
  const materials = D(input.materials);
  const hours = D(input.hours);

  const laborCost = D(costs.laborCost).mul(hours);
  const energyCost = D(costs.kwhRate).mul(hours);
  const deprCost = D(costs.deprPerHour).mul(hours);
  const toolingCost = D(costs.toolingPerPiece).mul(qty);
  const rentCost = D(costs.rentPerHour).mul(hours);

  const direct = materials.plus(laborCost).plus(energyCost).plus(deprCost).plus(toolingCost).plus(rentCost);
  const giAmount = direct.mul(gi);
  const subtotal = direct.plus(giAmount);
  const marginAmount = subtotal.mul(margin);
  const total = subtotal.plus(marginAmount);

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
  };
}

testCategoryBasedQuote().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
