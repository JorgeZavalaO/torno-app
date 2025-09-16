import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script simple para verificar costos de OT
 * Ejecutar con: npx tsx scripts/verify-ot-costs.ts
 */

async function verifyOTCosts() {
  console.log('🔍 Verificando costos de OTs...\n');

  try {
    // Obtener OTs con costos
    const ots = await prisma.ordenTrabajo.findMany({
      where: {
        OR: [
          { costMaterials: { gt: 0 } },
          { costLabor: { gt: 0 } },
          { costOverheads: { gt: 0 } }
        ]
      },
      select: {
        id: true,
        codigo: true,
        estado: true,
        costMaterials: true,
        costLabor: true,
        costOverheads: true,
        costTotal: true
      },
      take: 5
    });

    // Obtener conteos por separado
    const otIds = ots.map(ot => ot.id);
    const counts = await prisma.ordenTrabajo.findMany({
      where: { id: { in: otIds } },
      select: {
        id: true,
        _count: {
          select: {
            partesProduccion: true,
            materiales: true
          }
        }
      }
    });

    const countMap = new Map(counts.map(c => [c.id, c._count]));

    if (ots.length === 0) {
      console.log('📭 No se encontraron OTs con costos calculados');
      console.log('💡 Tip: Ejecuta algunas operaciones (emitir materiales, registrar horas) para generar costos');
      return;
    }

    console.log(`📊 Encontradas ${ots.length} OTs con costos:\n`);

    for (const ot of ots) {
      const counts = countMap.get(ot.id);
      console.log(`🏷️  OT: ${ot.codigo} (${ot.estado})`);
      console.log(`   📦 Materiales emitidos: ${counts?.materiales || 0}`);
      console.log(`   ⏱️  Partes registrados: ${counts?.partesProduccion || 0}`);
      console.log(`   💰 Costos:`);
      console.log(`      - Materiales: $${Number(ot.costMaterials || 0).toFixed(2)}`);
      console.log(`      - Mano de obra: $${Number(ot.costLabor || 0).toFixed(2)}`);
      console.log(`      - Overhead: $${Number(ot.costOverheads || 0).toFixed(2)}`);
      console.log(`      - Total: $${Number(ot.costTotal || 0).toFixed(2)}`);

      // Verificar consistencia
      const calculated = Number(ot.costMaterials || 0) + Number(ot.costLabor || 0) + Number(ot.costOverheads || 0);
      const stored = Number(ot.costTotal || 0);
      const diff = Math.abs(calculated - stored);

      if (diff < 0.01) {
        console.log(`   ✅ Costos consistentes`);
      } else {
        console.log(`   ❌ Inconsistencia: calculado $${calculated.toFixed(2)}, almacenado $${stored.toFixed(2)}`);
      }
      console.log('');
    }

    console.log('🎉 Verificación completada');

  } catch (error) {
    console.error('❌ Error al verificar costos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyOTCosts();
}