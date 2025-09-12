import { prisma } from "./src/app/lib/prisma";

/**
 * Script para crear datos de prueba y verificar la implementación completa
 */
async function createTestDataAndVerify() {
  console.log("🎯 Creando datos de prueba para verificar UI...\n");

  try {
    // Crear máquina de prueba con datos realistas
    const maquina = await prisma.maquina.upsert({
      where: { codigo: "CNC-001" },
      update: {},
      create: {
        codigo: "CNC-001",
        nombre: "Centro de Mecanizado Haas VF-3",
        categoria: "CNC",
        estado: "ACTIVA",
        ubicacion: "Área de Producción A",
        fabricante: "Haas",
        modelo: "VF-3",
        serie: "1234567",
      },
    });

    // Crear eventos variados para mostrar métricas
    const fecha = new Date();
    const eventos = await Promise.all([
      // Uso productivo
      prisma.maquinaEvento.create({
        data: {
          maquinaId: maquina.id,
          tipo: "USO",
          inicio: new Date(fecha.getTime() - 5 * 24 * 60 * 60 * 1000),
          fin: new Date(fecha.getTime() - 5 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
          horas: 8,
          nota: "Producción de piezas serie A",
        },
      }),
      // Paro por falla
      prisma.maquinaEvento.create({
        data: {
          maquinaId: maquina.id,
          tipo: "PARO",
          inicio: new Date(fecha.getTime() - 3 * 24 * 60 * 60 * 1000),
          fin: new Date(fecha.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          horas: 2,
          nota: "Paro por falla en sistema hidráulico",
        },
      }),
      // Avería específica
      prisma.maquinaEvento.create({
        data: {
          maquinaId: maquina.id,
          tipo: "AVERIA",
          inicio: new Date(fecha.getTime() - 2 * 24 * 60 * 60 * 1000),
          fin: new Date(fecha.getTime() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          horas: 4,
          nota: "Avería en husillo principal - cambio de rodamientos",
        },
      }),
      // Más uso productivo
      prisma.maquinaEvento.create({
        data: {
          maquinaId: maquina.id,
          tipo: "USO",
          inicio: new Date(fecha.getTime() - 1 * 24 * 60 * 60 * 1000),
          fin: new Date(fecha.getTime() - 1 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
          horas: 6,
          nota: "Producción de piezas serie B",
        },
      }),
    ]);

    // Crear mantenimientos
    const mantenimientos = await Promise.all([
      // Mantenimiento completado (genera costo)
      prisma.maquinaMantenimiento.create({
        data: {
          maquinaId: maquina.id,
          tipo: "CORRECTIVO",
          estado: "COMPLETADO",
          fechaProg: new Date(fecha.getTime() - 2 * 24 * 60 * 60 * 1000),
          fechaReal: new Date(fecha.getTime() - 2 * 24 * 60 * 60 * 1000),
          costo: 1500.0,
          nota: "Reparación de husillo principal",
        },
      }),
      // Mantenimiento preventivo programado para el futuro
      prisma.maquinaMantenimiento.create({
        data: {
          maquinaId: maquina.id,
          tipo: "PREVENTIVO",
          estado: "PENDIENTE",
          fechaProg: new Date(fecha.getTime() + 10 * 24 * 60 * 60 * 1000),
          fechaReal: null,
          costo: 0,
          nota: "Mantenimiento preventivo trimestral",
        },
      }),
    ]);

    console.log("✅ Datos de prueba creados:");
    console.log(`   📋 Máquina: ${maquina.codigo} - ${maquina.nombre}`);
    console.log(`   📊 Eventos: ${eventos.length} eventos creados`);
    console.log(`   🔧 Mantenimientos: ${mantenimientos.length} mantenimientos creados`);
    console.log("");

    // Verificar que las métricas se calculen correctamente
    // Como no podemos usar cache fuera de Next.js, vamos a hacer las queries manualmente
    const fecha30DiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Métricas calculadas manualmente para comparar
    const totalHoras = await prisma.maquinaEvento.aggregate({
      where: { 
        maquinaId: maquina.id,
        inicio: { gte: fecha30DiasAtras }
      },
      _sum: { horas: true }
    });

    const paradasFallas = await prisma.maquinaEvento.count({
      where: { 
        maquinaId: maquina.id,
        tipo: { in: ["PARO", "AVERIA"] },
        inicio: { gte: fecha30DiasAtras }
      }
    });

    const averias = await prisma.maquinaEvento.count({
      where: { 
        maquinaId: maquina.id,
        tipo: "AVERIA",
        inicio: { gte: fecha30DiasAtras }
      }
    });

    const costos = await prisma.maquinaMantenimiento.aggregate({
      where: {
        maquinaId: maquina.id,
        estado: "COMPLETADO",
        fechaReal: { gte: fecha30DiasAtras }
      },
      _sum: { costo: true }
    });

    console.log("📊 MÉTRICAS CALCULADAS PARA LA UI:");
    console.log("─".repeat(50));
    console.log(`🕒 Horas totales (30d): ${Number(totalHoras._sum.horas || 0)}h`);
    console.log(`⚠️  Paradas por fallas: ${paradasFallas} (1 PARO + 1 AVERIA)`);
    console.log(`🔴 Averías específicas: ${averias}`);
    console.log(`💰 Costo mantenimientos: $${Number(costos._sum.costo || 0)}`);
    console.log(`⏰ Próximo mantenimiento: en 10 días (240h aprox)`);

    console.log("\n🚀 ¡Los datos están listos para probar en la UI!");
    console.log("   Ve a http://localhost:3000/maquinas para ver las métricas");
    console.log("");
    console.log("🔍 Esperado en la tabla:");
    console.log("   • Horas 30d: 20.0h (8+2+4+6)");
    console.log("   • Paradas: 2 (con ícono ⚠️)");
    console.log("   • Averías: 1 (badge rojo)");
    console.log("   • Sig. Mant.: 240h (~10d) (con ícono 🕐)");
    console.log("   • Costo Mant.: $1,500 (con ícono 💰)");
    
    console.log("\n✨ Para limpiar los datos de prueba, ejecuta:");
    console.log("   npx tsx cleanup-test-data.ts");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDataAndVerify();