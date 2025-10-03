/**
 * Script para probar la nueva implementación de parámetros de costeo
 * diferenciados por tipo de máquina
 */

import { getCostingParamsCached, getCostingParamsGrouped, getCostsByMachineType } from "@/app/server/queries/costing-params";

async function testCostingParams() {
  console.log("=".repeat(80));
  console.log("PRUEBA DE PARÁMETROS DE COSTEO DIFERENCIADOS");
  console.log("=".repeat(80));
  console.log();

  try {
    // 1. Obtener todos los parámetros
    console.log("📋 1. TODOS LOS PARÁMETROS DE COSTEO");
    console.log("-".repeat(80));
    const allParams = await getCostingParamsCached();
    console.log(`Total de parámetros: ${allParams.length}`);
    console.log();

    // 2. Parámetros agrupados
    console.log("📊 2. PARÁMETROS AGRUPADOS");
    console.log("-".repeat(80));
    const grouped = await getCostingParamsGrouped();
    
    for (const [group, params] of Object.entries(grouped)) {
      console.log(`\n🏷️  Grupo: ${group.toUpperCase()}`);
      console.log("   " + "=".repeat(70));
      
      for (const param of params) {
        const value = param.type === "TEXT" 
          ? param.valueText 
          : param.valueNumber?.toString();
        const formattedValue = param.type === "PERCENT" 
          ? `${(Number(value) * 100).toFixed(2)}%`
          : param.type === "CURRENCY"
          ? `$${Number(value).toFixed(2)}`
          : value;
        
        console.log(`   • ${param.label}`);
        console.log(`     Key: ${param.key}`);
        console.log(`     Valor: ${formattedValue} ${param.unit || ""}`);
      }
    }
    console.log();

    // 3. Comparación de costos por tipo de máquina
    console.log("⚙️  3. COMPARACIÓN DE COSTOS POR TIPO DE MÁQUINA");
    console.log("-".repeat(80));
    
    const costosParalelo = await getCostsByMachineType("PARALELO");
    const costosCNC = await getCostsByMachineType("CNC");
    const costosLegacy = await getCostsByMachineType(null);

    console.log("\n🔧 TORNO PARALELO:");
    console.log("   " + "=".repeat(70));
    console.log(`   • Mano de obra:    $${costosParalelo.laborCost.toFixed(2)}/hora`);
    console.log(`   • Depreciación:    $${costosParalelo.deprPerHour.toFixed(2)}/hora`);
    console.log(`   • Energía (LUZ):   $${costosParalelo.kwhRate.toFixed(2)}/hora`);
    console.log(`   • Herramientas:    $${costosParalelo.toolingPerPiece.toFixed(2)}/pieza`);
    console.log(`   • Alquiler:        $${costosParalelo.rentPerHour.toFixed(2)}/hora`);
    console.log(`   • Gastos indirectos: ${(costosParalelo.gi * 100).toFixed(2)}%`);
    console.log(`   • Margen utilidad:   ${(costosParalelo.margin * 100).toFixed(2)}%`);
    
    const totalHoraParalelo = 
      costosParalelo.laborCost + 
      costosParalelo.deprPerHour + 
      costosParalelo.kwhRate + 
      costosParalelo.rentPerHour;
    console.log(`   ─────────────────────────────────────────`);
    console.log(`   💰 COSTO TOTAL/HORA: $${totalHoraParalelo.toFixed(2)} USD`);

    console.log("\n🤖 TORNO CNC:");
    console.log("   " + "=".repeat(70));
    console.log(`   • Mano de obra:    $${costosCNC.laborCost.toFixed(2)}/hora`);
    console.log(`   • Depreciación:    $${costosCNC.deprPerHour.toFixed(2)}/hora`);
    console.log(`   • Energía (LUZ):   $${costosCNC.kwhRate.toFixed(2)}/hora`);
    console.log(`   • Herramientas:    $${costosCNC.toolingPerPiece.toFixed(2)}/pieza`);
    console.log(`   • Alquiler:        $${costosCNC.rentPerHour.toFixed(2)}/hora`);
    console.log(`   • Gastos indirectos: ${(costosCNC.gi * 100).toFixed(2)}%`);
    console.log(`   • Margen utilidad:   ${(costosCNC.margin * 100).toFixed(2)}%`);
    
    const totalHoraCNC = 
      costosCNC.laborCost + 
      costosCNC.deprPerHour + 
      costosCNC.kwhRate + 
      costosCNC.rentPerHour;
    console.log(`   ─────────────────────────────────────────`);
    console.log(`   💰 COSTO TOTAL/HORA: $${totalHoraCNC.toFixed(2)} USD`);

    console.log("\n📜 VALORES LEGACY (compatibilidad):");
    console.log("   " + "=".repeat(70));
    console.log(`   • Mano de obra:    $${costosLegacy.laborCost.toFixed(2)}/hora`);
    console.log(`   • Depreciación:    $${costosLegacy.deprPerHour.toFixed(2)}/hora`);
    console.log(`   • Energía (kWh):   $${costosLegacy.kwhRate.toFixed(2)}/kWh`);
    console.log(`   • Herramientas:    $${costosLegacy.toolingPerPiece.toFixed(2)}/pieza`);
    console.log(`   • Alquiler:        $${costosLegacy.rentPerHour.toFixed(2)}/hora`);

    // 4. Diferencia de costos
    console.log("\n📊 4. ANÁLISIS COMPARATIVO");
    console.log("-".repeat(80));
    
    const difManoObra = costosCNC.laborCost - costosParalelo.laborCost;
    const difDepreciacion = costosCNC.deprPerHour - costosParalelo.deprPerHour;
    const difTotal = totalHoraCNC - totalHoraParalelo;
    
    console.log(`\n💡 Diferencia CNC vs PARALELO:`);
    console.log(`   • Mano de obra:    ${difManoObra >= 0 ? '+' : ''}$${difManoObra.toFixed(2)}/hora (${((difManoObra / costosParalelo.laborCost) * 100).toFixed(1)}%)`);
    console.log(`   • Depreciación:    ${difDepreciacion >= 0 ? '+' : ''}$${difDepreciacion.toFixed(2)}/hora (${((difDepreciacion / costosParalelo.deprPerHour) * 100).toFixed(1)}%)`);
    console.log(`   • TOTAL:           ${difTotal >= 0 ? '+' : ''}$${difTotal.toFixed(2)}/hora (${((difTotal / totalHoraParalelo) * 100).toFixed(1)}%)`);

    console.log("\n✅ PRUEBA COMPLETADA EXITOSAMENTE");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ ERROR EN LA PRUEBA:");
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testCostingParams()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  });
