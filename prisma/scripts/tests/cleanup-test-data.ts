import { prisma } from "../../../src/app/lib/prisma";

/**
 * Script para limpiar los datos de prueba
 */
async function cleanupTestData() {
  console.log("🧹 Limpiando datos de prueba...\n");

  try {
    // Buscar máquina de prueba
    const maquina = await prisma.maquina.findUnique({
      where: { codigo: "CNC-001" }
    });

    if (!maquina) {
      console.log("ℹ️  No se encontró la máquina de prueba CNC-001");
      return;
    }

    // Eliminar eventos
    const deletedEventos = await prisma.maquinaEvento.deleteMany({
      where: { maquinaId: maquina.id }
    });

    // Eliminar mantenimientos
    const deletedMantenimientos = await prisma.maquinaMantenimiento.deleteMany({
      where: { maquinaId: maquina.id }
    });

    // Eliminar máquina
    await prisma.maquina.delete({
      where: { id: maquina.id }
    });

    console.log("✅ Datos de prueba eliminados:");
    console.log(`   📊 Eventos eliminados: ${deletedEventos.count}`);
    console.log(`   🔧 Mantenimientos eliminados: ${deletedMantenimientos.count}`);
    console.log(`   📋 Máquina eliminada: ${maquina.codigo}`);
    console.log("\n🎉 ¡Limpieza completada!");

  } catch (error) {
    console.error("❌ Error durante la limpieza:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();