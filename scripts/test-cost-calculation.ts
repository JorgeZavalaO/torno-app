import { recomputeOTCosts } from '../src/app/(protected)/ot/actions';
import { prisma } from '../src/app/lib/prisma';

/**
 * Script de prueba para validar el cálculo de costos de OT
 * Ejecutar con: npx tsx scripts/test-cost-calculation.ts
 */

async function testCostCalculation() {
  console.log('🧪 Probando cálculo de costos de OT...\n');

  // Obtener una OT de ejemplo (la primera que encontremos)
  const ot = await prisma.ordenTrabajo.findFirst({
    include: {
      cliente: true,
      materiales: { include: { producto: true } },
      piezas: true,
      partesProduccion: true,
    }
  });

  if (!ot) {
    console.log('❌ No se encontraron OTs para probar');
    return;
  }

  console.log(`📋 Probando con OT: ${ot.codigo} (${ot.id})`);
  console.log(`📊 Estado actual: ${ot.estado}`);
  console.log(`💰 Costos actuales:`);
  console.log(`   - Materiales: $${Number(ot.costMaterials || 0).toFixed(2)}`);
  console.log(`   - Mano de obra: $${Number(ot.costLabor || 0).toFixed(2)}`);
  console.log(`   - Overhead: $${Number(ot.costOverheads || 0).toFixed(2)}`);
  console.log(`   - Total: $${Number(ot.costTotal || 0).toFixed(2)}\n`);

  // Ejecutar recálculo
  console.log('🔄 Ejecutando recomputeOTCosts...');
  await recomputeOTCosts(ot.id);

  // Obtener valores actualizados
  const updatedOt = await prisma.ordenTrabajo.findUnique({
    where: { id: ot.id },
    select: {
      costMaterials: true,
      costLabor: true,
      costOverheads: true,
      costTotal: true,
      costParams: true
    }
  });

  if (!updatedOt) {
    console.log('❌ Error al obtener OT actualizada');
    return;
  }

  console.log(`✅ Costos recalculados:`);
  console.log(`   - Materiales: $${Number(updatedOt.costMaterials || 0).toFixed(2)}`);
  console.log(`   - Mano de obra: $${Number(updatedOt.costLabor || 0).toFixed(2)}`);
  console.log(`   - Overhead: $${Number(updatedOt.costOverheads || 0).toFixed(2)}`);
  console.log(`   - Total: $${Number(updatedOt.costTotal || 0).toFixed(2)}`);

  // Verificar consistencia
  const expectedTotal = Number(updatedOt.costMaterials || 0) +
                       Number(updatedOt.costLabor || 0) +
                       Number(updatedOt.costOverheads || 0);
  const actualTotal = Number(updatedOt.costTotal || 0);

  if (Math.abs(expectedTotal - actualTotal) < 0.01) {
    console.log('✅ Verificación: Total consistente');
  } else {
    console.log(`❌ Error: Total inconsistente. Esperado: $${expectedTotal.toFixed(2)}, Actual: $${actualTotal.toFixed(2)}`);
  }

  // Mostrar parámetros de costeo aplicados
  if (updatedOt.costParams) {
    console.log('\n⚙️ Parámetros de costeo aplicados:');
    const params = updatedOt.costParams as Record<string, unknown>;
    console.log(`   - Tarifa por hora: $${Number(params.hourlyRate || 0).toFixed(2)}`);
    console.log(`   - Depreciación por hora: $${Number(params.deprPerHour || 0).toFixed(2)}`);
    console.log(`   - Renta por hora: $${Number(params.rentPerHour || 0).toFixed(2)}`);
    console.log(`   - Tooling por pieza: $${Number(params.toolingPerPiece || 0).toFixed(2)}`);
  }

  console.log('\n🎉 Prueba completada');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testCostCalculation()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export { testCostCalculation };