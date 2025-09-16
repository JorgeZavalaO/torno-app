const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testToggleMoneda() {
  try {
    console.log("🧪 Probando activación/desactivación de monedas...\n");

    // Buscar una moneda inactiva
    const monedaInactiva = await prisma.configuracionCatalogo.findFirst({
      where: {
        tipo: "MONEDA",
        activo: false
      }
    });

    if (!monedaInactiva) {
      console.log("❌ No se encontró ninguna moneda inactiva para probar");
      return;
    }

    console.log(`📍 Probando con: ${monedaInactiva.nombre} (${monedaInactiva.codigo})`);
    console.log(`Estado inicial: ${monedaInactiva.activo ? '✅ ACTIVO' : '❌ INACTIVO'}\n`);

    // Activar la moneda
    console.log("🔄 Activando moneda...");
    const activada = await prisma.configuracionCatalogo.update({
      where: { id: monedaInactiva.id },
      data: { activo: true }
    });

    console.log(`✅ Moneda activada: ${activada.nombre} - Estado: ${activada.activo ? 'ACTIVO' : 'INACTIVO'}\n`);

    // Esperar un segundo y desactivar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("🔄 Desactivando moneda...");
    const desactivada = await prisma.configuracionCatalogo.update({
      where: { id: monedaInactiva.id },
      data: { activo: false }
    });

    console.log(`❌ Moneda desactivada: ${desactivada.nombre} - Estado: ${desactivada.activo ? 'ACTIVO' : 'INACTIVO'}\n`);

    console.log("✅ Prueba completada exitosamente - El toggle funciona correctamente en la base de datos");

  } catch (error) {
    console.error("❌ Error en la prueba:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testToggleMoneda();