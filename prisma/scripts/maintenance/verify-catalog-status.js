const { PrismaClient } = require('@prisma/client');

async function verifyStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando estado del catálogo...\n');
    
    // Obtener todas las monedas
    const monedas = await prisma.configuracionCatalogo.findMany({
      where: {
        tipo: 'MONEDA'
      },
      orderBy: { orden: 'asc' }
    });
    
    console.log(`💰 MONEDAS (${monedas.length} encontradas):`);
    monedas.forEach((moneda, index) => {
      const estado = moneda.activo ? '✅ ACTIVO' : '❌ INACTIVO';
      console.log(`  ${index + 1}. ${moneda.nombre} (${moneda.codigo}) - ${estado} - Orden: ${moneda.orden}`);
    });
    
    console.log('\n📊 Resumen:');
    const activas = monedas.filter(m => m.activo).length;
    const inactivas = monedas.filter(m => !m.activo).length;
    console.log(`  • Monedas activas: ${activas}`);
    console.log(`  • Monedas inactivas: ${inactivas}`);
    console.log(`  • Total: ${monedas.length}`);
    
    // Verificar ordenamiento automático
    const maxOrden = Math.max(...monedas.map(m => m.orden || 0));
    console.log(`  • Próximo orden disponible: ${maxOrden + 1}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyStatus();