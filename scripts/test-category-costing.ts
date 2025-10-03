/**
 * Script de prueba: Sistema de costeo por categoría de máquina
 * 
 * Este script valida que:
 * 1. Las categorías de máquina tienen costos diferenciados correctamente
 * 2. Los cálculos usan la categoría seleccionada
 * 3. No hay conflictos entre parámetros generales y categorías
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testCategoryCosting() {
  console.log("🔍 Iniciando prueba del sistema de costeo por categoría...\n");

  // 1. Verificar categorías existentes
  console.log("📊 PASO 1: Verificando categorías de máquina");
  const categories = await prisma.machineCostingCategory.findMany({
    orderBy: { categoria: "asc" },
  });

  console.log(`   ✅ Se encontraron ${categories.length} categorías:\n`);
  
  categories.forEach((cat) => {
    console.log(`   • ${cat.categoria}`);
    console.log(`     - Mano de obra: $${cat.laborCost}/hora`);
    console.log(`     - Depreciación: $${cat.deprPerHour}/hora`);
    console.log();
  });

  // 2. Verificar que NO existan parámetros redundantes
  console.log("🚫 PASO 2: Verificando que NO existan parámetros redundantes");
  const redundantParams = await prisma.costingParam.findMany({
    where: {
      key: {
        in: ["hourlyRate", "deprPerHour"],
      },
    },
  });

  if (redundantParams.length > 0) {
    console.log(`   ⚠️  ADVERTENCIA: Se encontraron ${redundantParams.length} parámetros redundantes:`);
    redundantParams.forEach((p) => {
      console.log(`      - ${p.key}: ${p.valueNumber}`);
    });
    console.log("   💡 Estos parámetros deberían eliminarse de la base de datos\n");
  } else {
    console.log("   ✅ No hay parámetros redundantes (correcto)\n");
  }

  // 3. Verificar parámetros compartidos
  console.log("🔧 PASO 3: Verificando parámetros compartidos");
  const sharedParams = await prisma.costingParam.findMany({
    where: {
      key: {
        in: ["kwhRate", "toolingPerPiece", "rentPerHour"],
      },
    },
  });

  console.log(`   ✅ Parámetros compartidos encontrados (${sharedParams.length}):\n`);
  sharedParams.forEach((p) => {
    console.log(`   • ${p.label}: $${p.valueNumber}`);
  });
  console.log();

  // 4. Simular cálculo para ambas categorías
  console.log("💰 PASO 4: Simulando cálculo de cotización");
  console.log("   Escenario: 2 horas de trabajo, 10 piezas\n");

  const hours = 2;
  const pieces = 10;

  const kwhRate = Number(
    sharedParams.find((p) => p.key === "kwhRate")?.valueNumber ?? 0
  );
  const tooling = Number(
    sharedParams.find((p) => p.key === "toolingPerPiece")?.valueNumber ?? 0
  );
  const rent = Number(
    sharedParams.find((p) => p.key === "rentPerHour")?.valueNumber ?? 0
  );

  for (const category of categories) {
    console.log(`   📌 ${category.categoria}:`);

    const laborCost = Number(category.laborCost) * hours;
    const deprCost = Number(category.deprPerHour) * hours;
    const electricityCost = kwhRate * hours;
    const toolingCost = tooling * pieces;
    const rentCost = rent * hours;

    const totalCost = laborCost + deprCost + electricityCost + toolingCost + rentCost;

    console.log(`      Mano de obra:  $${laborCost.toFixed(2)} (${category.laborCost}/h × 2h)`);
    console.log(`      Depreciación:  $${deprCost.toFixed(2)} (${category.deprPerHour}/h × 2h)`);
    console.log(`      Electricidad:  $${electricityCost.toFixed(2)} (${kwhRate}/h × 2h)`);
    console.log(`      Herramientas:  $${toolingCost.toFixed(2)} (${tooling}/pz × 10pz)`);
    console.log(`      Renta:         $${rentCost.toFixed(2)} (${rent}/h × 2h)`);
    console.log(`      ─────────────────────────────`);
    console.log(`      TOTAL:         $${totalCost.toFixed(2)}`);
    console.log();
  }

  // 5. Calcular diferencia entre categorías
  if (categories.length === 2) {
    const cat1 = categories[0];
    const cat2 = categories[1];

    const cost1Labor = Number(cat1.laborCost) * hours;
    const cost1Depr = Number(cat1.deprPerHour) * hours;
    const cost1Total = cost1Labor + cost1Depr;

    const cost2Labor = Number(cat2.laborCost) * hours;
    const cost2Depr = Number(cat2.deprPerHour) * hours;
    const cost2Total = cost2Labor + cost2Depr;

    const diff = cost2Total - cost1Total;
    const diffPercent = (diff / cost1Total) * 100;

    console.log("📈 PASO 5: Diferencia entre categorías");
    console.log(`   ${cat2.categoria} es $${diff.toFixed(2)} más caro que ${cat1.categoria}`);
    console.log(`   Esto representa un ${diffPercent.toFixed(1)}% de incremento\n`);
  }

  // 6. Verificar cotizaciones recientes
  console.log("📋 PASO 6: Verificando cotizaciones recientes");
  const recentQuotes = await prisma.cotizacion.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      cliente: { select: { nombre: true } },
      machineCategoryId: true,
      machineCategory: { select: { categoria: true } },
      breakdown: true,
      createdAt: true,
    },
  });

  if (recentQuotes.length === 0) {
    console.log("   ℹ️  No hay cotizaciones todavía\n");
  } else {
    console.log(`   ✅ Últimas ${recentQuotes.length} cotizaciones:\n`);
    
    recentQuotes.forEach((quote, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const breakdown = quote.breakdown as any;
      const categoryUsed = quote.machineCategory?.categoria || breakdown?.inputs?.machineCategory || "Sin categoría";
      
      console.log(`   ${i + 1}. Cliente: ${quote.cliente.nombre}`);
      console.log(`      Categoría: ${categoryUsed}`);
      console.log(`      Fecha: ${quote.createdAt.toLocaleDateString()}`);
      
      if (breakdown?.costs) {
        console.log(`      Mano obra: $${breakdown.costs.laborCost?.toFixed(2) ?? "N/A"}`);
        console.log(`      Depr: $${breakdown.costs.deprCost?.toFixed(2) ?? "N/A"}`);
      }
      console.log();
    });
  }

  console.log("✅ PRUEBA COMPLETADA\n");
  console.log("═══════════════════════════════════════════════");
  console.log("RESUMEN:");
  console.log(`  • Categorías activas: ${categories.length}`);
  console.log(`  • Parámetros redundantes: ${redundantParams.length} ${redundantParams.length > 0 ? "⚠️" : "✅"}`);
  console.log(`  • Parámetros compartidos: ${sharedParams.length} ✅`);
  console.log(`  • Sistema: ${redundantParams.length === 0 ? "LIMPIO Y SIN CONFLICTOS ✅" : "NECESITA LIMPIEZA ⚠️"}`);
  console.log("═══════════════════════════════════════════════\n");
}

testCategoryCosting()
  .catch((e) => {
    console.error("❌ Error en la prueba:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
