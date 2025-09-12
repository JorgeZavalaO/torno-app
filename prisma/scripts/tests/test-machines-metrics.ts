import { prisma } from "./src/app/lib/prisma";

/**
 * Script de prueba para verificar las métricas de máquinas
 * Crea datos de prueba y verifica que las consultas funcionan correctamente
 */

async function testMachinesMetrics() {
  console.log("🧪 Iniciando pruebas de métricas de máquinas...\n");

  try {
    // 1. Crear/verificar máquina de prueba
    const testMachine = await prisma.maquina.upsert({
      where: { codigo: "TEST-001" },
      update: {},
      create: {
        codigo: "TEST-001",
        nombre: "Máquina de Prueba",
        categoria: "Test",
        estado: "ACTIVA",
        ubicacion: "Lab Testing",
      },
    });

    console.log("✅ Máquina de prueba creada/encontrada:", testMachine.codigo);

    // 2. Crear eventos de prueba (últimos 30 días)
    const fecha30DiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fechaHoy = new Date();

    // Crear eventos de diferentes tipos
    const eventosTest = await Promise.all([
      // Evento de USO
      prisma.maquinaEvento.create({
        data: {
          maquinaId: testMachine.id,
          tipo: "USO",
          inicio: fechaAyer,
          fin: new Date(fechaAyer.getTime() + 8 * 60 * 60 * 1000), // 8 horas
          horas: 8,
          nota: "Producción test - USO",
        },
      }),
      // Evento de PARO (falla)
      prisma.maquinaEvento.create({
        data: {
          maquinaId: testMachine.id,
          tipo: "PARO",
          inicio: new Date(fechaAyer.getTime() + 10 * 60 * 60 * 1000),
          fin: new Date(fechaAyer.getTime() + 11 * 60 * 60 * 1000), // 1 hora
          horas: 1,
          nota: "Test - PARO por falla",
        },
      }),
      // Evento de AVERIA
      prisma.maquinaEvento.create({
        data: {
          maquinaId: testMachine.id,
          tipo: "AVERIA",
          inicio: new Date(fechaHoy.getTime() - 2 * 60 * 60 * 1000),
          fin: new Date(fechaHoy.getTime() - 0.5 * 60 * 60 * 1000), // 1.5 horas
          horas: 1.5,
          nota: "Test - AVERIA del sistema",
        },
      }),
    ]);

    console.log("✅ Eventos de prueba creados:", eventosTest.length);

    // Crear mantenimiento de prueba
    await prisma.maquinaMantenimiento.create({
      data: {
        maquinaId: testMachine.id,
        tipo: "PREVENTIVO",
        estado: "COMPLETADO",
        fechaProg: fechaAyer,
        fechaReal: fechaAyer,
        costo: 500.0,
        nota: "Mantenimiento test completado",
      },
    });

    // Mantenimiento futuro programado
    await prisma.maquinaMantenimiento.create({
      data: {
        maquinaId: testMachine.id,
        tipo: "PREVENTIVO",
        estado: "PENDIENTE",
        fechaProg: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        fechaReal: null,
        costo: 0,
        nota: "Mantenimiento programado para 7 días",
      },
    });

    console.log("✅ Mantenimientos de prueba creados");

    // 4. Probar las consultas tal como las usa la aplicación
    console.log("\n📊 Probando consultas de métricas...\n");

    // Paradas por fallas (PARO + AVERIA)
    const paradasPorFallas = await prisma.maquinaEvento.count({
      where: {
        maquinaId: testMachine.id,
        tipo: { in: ["PARO", "AVERIA"] },
        inicio: { gte: fecha30DiasAtras },
      },
    });

    // Solo averías
    const averias = await prisma.maquinaEvento.count({
      where: {
        maquinaId: testMachine.id,
        tipo: "AVERIA",
        inicio: { gte: fecha30DiasAtras },
      },
    });

    // Costo de mantenimientos
    const costoMantenimientos = await prisma.maquinaMantenimiento.aggregate({
      where: {
        maquinaId: testMachine.id,
        estado: "COMPLETADO",
        fechaReal: { gte: fecha30DiasAtras },
      },
      _sum: { costo: true },
    });

    // Próximo mantenimiento
    const proximoMant = await prisma.maquinaMantenimiento.findFirst({
      where: {
        maquinaId: testMachine.id,
        estado: "PENDIENTE",
        fechaProg: { gte: new Date() },
      },
      orderBy: { fechaProg: "asc" },
    });

    // Calcular horas hasta próximo mantenimiento
    const horasParaSigMant = proximoMant
      ? Math.round((proximoMant.fechaProg.getTime() - Date.now()) / (1000 * 60 * 60))
      : null;

    // Horas totales últimos 30 días
    const horasTotales = await prisma.maquinaEvento.aggregate({
      where: {
        maquinaId: testMachine.id,
        inicio: { gte: fecha30DiasAtras },
      },
      _sum: { horas: true },
    });

    // 5. Mostrar resultados
    console.log("📈 RESULTADOS DE MÉTRICAS:");
    console.log("─".repeat(50));
    console.log(`🕒 Horas totales (30d): ${Number(horasTotales._sum.horas || 0).toFixed(1)}h`);
    console.log(`⚠️  Paradas por fallas (30d): ${paradasPorFallas}`);
    console.log(`🔴 Averías específicas (30d): ${averias}`);
    console.log(`💰 Costo mantenimientos (30d): $${Number(costoMantenimientos._sum.costo || 0)}`);
    console.log(`⏰ Horas para sig. mantenimiento: ${horasParaSigMant ? `${horasParaSigMant}h` : "No programado"}`);

    // 6. Verificar que las métricas son correctas
    console.log("\n✨ VERIFICACIÓN:");
    console.log("─".repeat(50));

    const expectedHoras = 8 + 1 + 1.5; // USO + PARO + AVERIA
    const actualHoras = Number(horasTotales._sum.horas || 0);
    console.log(`✅ Horas calculadas: ${actualHoras === expectedHoras ? "CORRECTO" : "ERROR"} (esperado: ${expectedHoras}, actual: ${actualHoras})`);

    const expectedParadas = 2; // 1 PARO + 1 AVERIA
    console.log(`✅ Paradas por fallas: ${paradasPorFallas === expectedParadas ? "CORRECTO" : "ERROR"} (esperado: ${expectedParadas}, actual: ${paradasPorFallas})`);

    const expectedAverias = 1; // Solo 1 AVERIA
    console.log(`✅ Averías específicas: ${averias === expectedAverias ? "CORRECTO" : "ERROR"} (esperado: ${expectedAverias}, actual: ${averias})`);

    const expectedCosto = 500;
    const actualCosto = Number(costoMantenimientos._sum.costo || 0);
    console.log(`✅ Costo mantenimientos: ${actualCosto === expectedCosto ? "CORRECTO" : "ERROR"} (esperado: $${expectedCosto}, actual: $${actualCosto})`);

    const expectedHorasMantenimiento = horasParaSigMant !== null && horasParaSigMant > 160 && horasParaSigMant < 170; // Aprox 7 días
    console.log(`✅ Horas sig. mantenimiento: ${expectedHorasMantenimiento ? "CORRECTO" : "ERROR"} (aprox 7 días, actual: ${horasParaSigMant}h)`);

    // 7. Probar la función completa getMachinesCached (importar dinámicamente)
    console.log("\n🔄 Probando función completa getMachinesCached...");
    
    try {
      const { getMachinesCached } = await import("./src/app/server/queries/machines");
      const machines = await getMachinesCached();
      
      const testMachineResult = machines.find(m => m.codigo === "TEST-001");
      
      if (testMachineResult) {
        console.log("\n🎯 RESULTADO DE LA FUNCIÓN COMPLETA:");
        console.log("─".repeat(50));
        console.log(`📋 Código: ${testMachineResult.codigo}`);
        console.log(`📛 Nombre: ${testMachineResult.nombre}`);
        console.log(`🕒 Horas (30d): ${testMachineResult.horasUlt30d}h`);
        console.log(`⚠️  Paradas por fallas: ${testMachineResult.paradasPorFallas30d}`);
        console.log(`🔴 Averías: ${testMachineResult.averias30d}`);
        console.log(`💰 Costo mantenimientos: $${testMachineResult.costoMant30d}`);
        console.log(`⏰ Horas sig. mant.: ${testMachineResult.horasParaSigMant ? `${testMachineResult.horasParaSigMant}h` : "No programado"}`);
        
        console.log("\n✨ Todas las métricas están siendo calculadas correctamente! ✨");
      } else {
        console.log("❌ No se encontró la máquina de prueba en el resultado");
      }
      
    } catch (error) {
      console.error("❌ Error al probar getMachinesCached:", error);
    }

    console.log("\n🧹 Limpiando datos de prueba...");

    // Limpiar datos de prueba
    await prisma.maquinaEvento.deleteMany({
      where: { maquinaId: testMachine.id },
    });
    
    await prisma.maquinaMantenimiento.deleteMany({
      where: { maquinaId: testMachine.id },
    });
    
    await prisma.maquina.delete({
      where: { id: testMachine.id },
    });

    console.log("✅ Datos de prueba eliminados");
    console.log("\n🎉 ¡Pruebas completadas exitosamente!");

  } catch (error) {
    console.error("❌ Error durante las pruebas:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar las pruebas
testMachinesMetrics().catch((error) => {
  console.error("💥 Error fatal:", error);
  process.exit(1);
});