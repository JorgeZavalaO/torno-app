/**
 * Script para limpiar parámetros obsoletos después de migrar a categorías dinámicas
 * Ejecutar: pnpm tsx prisma/scripts/maintenance/cleanup-obsolete-params.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OBSOLETE_PARAMS = [
  // Parámetros específicos de PARALELO y CNC (ahora en MachineCostingCategory)
  "laborCost_paralelo",
  "deprPerHour_paralelo",
  "laborCost_cnc",
  "deprPerHour_cnc",
  
  // Parámetros legacy redundantes
  "hourlyRate",
  "laborCost",
  "deprPerHour",
];

async function cleanupObsoleteParams() {
  console.log("=".repeat(80));
  console.log("LIMPIEZA DE PARÁMETROS OBSOLETOS");
  console.log("=".repeat(80));
  console.log();

  try {
    // 1. Verificar parámetros existentes
    console.log("📋 Verificando parámetros obsoletos...");
    const obsoleteParams = await prisma.costingParam.findMany({
      where: {
        key: {
          in: OBSOLETE_PARAMS,
        },
      },
    });

    if (obsoleteParams.length === 0) {
      console.log("✅ No se encontraron parámetros obsoletos para limpiar.");
      return;
    }

    console.log(`\n🔍 Encontrados ${obsoleteParams.length} parámetros obsoletos:`);
    for (const param of obsoleteParams) {
      console.log(`   - ${param.key} (${param.label})`);
    }

    // 2. Eliminar parámetros obsoletos
    console.log("\n🗑️  Eliminando parámetros obsoletos...");
    const result = await prisma.costingParam.deleteMany({
      where: {
        key: {
          in: OBSOLETE_PARAMS,
        },
      },
    });

    console.log(`✅ Eliminados ${result.count} parámetros obsoletos.`);

    // 3. Verificar categorías de máquinas
    console.log("\n📊 Verificando categorías de máquinas...");
    const categories = await prisma.machineCostingCategory.findMany({
      where: { activo: true },
    });

    console.log(`✅ Categorías activas: ${categories.length}`);
    for (const cat of categories) {
      console.log(`   - ${cat.categoria}: $${cat.laborCost}/h (MO) + $${cat.deprPerHour}/h (Depr)`);
    }

    // 4. Verificar parámetros restantes
    console.log("\n📋 Parámetros compartidos restantes:");
    const remainingParams = await prisma.costingParam.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    const groupedParams = remainingParams.reduce((acc, param) => {
      const group = param.group || "sin_grupo";
      if (!acc[group]) acc[group] = [];
      acc[group].push(param);
      return acc;
    }, {} as Record<string, typeof remainingParams>);

    for (const [group, params] of Object.entries(groupedParams)) {
      console.log(`\n   [${group}]`);
      for (const param of params) {
        const value = param.type === "TEXT" 
          ? param.valueText 
          : param.type === "PERCENT"
          ? `${(Number(param.valueNumber) * 100).toFixed(2)}%`
          : `$${Number(param.valueNumber).toFixed(2)}`;
        console.log(`      ${param.key}: ${value} - ${param.label}`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ LIMPIEZA COMPLETADA EXITOSAMENTE");
    console.log("=".repeat(80));
    console.log();
    console.log("📌 Resumen:");
    console.log(`   • Parámetros eliminados: ${result.count}`);
    console.log(`   • Parámetros restantes: ${remainingParams.length}`);
    console.log(`   • Categorías de máquinas: ${categories.length}`);
    console.log();
    console.log("💡 Ahora los costos de mano de obra y depreciación se gestionan");
    console.log("   exclusivamente a través de las Categorías de Máquinas.");
    console.log();

  } catch (error) {
    console.error("\n❌ ERROR durante la limpieza:");
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
cleanupObsoleteParams()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  });
