// Script de prueba para verificar búsqueda por códigos equivalentes
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEquivalentCodesSearch() {
  try {
    // 1. Crear un producto de prueba si no existe
    const testSku = 'TEST-SEARCH-001';
    
    // Verificar si existe
    let testProduct = await prisma.producto.findFirst({
      where: { sku: testSku }
    });

    if (!testProduct) {
      testProduct = await prisma.producto.create({
        data: {
          sku: testSku,
          nombre: 'Producto de Prueba Búsqueda',
          categoria: 'HERRAMIENTA_CORTE',
          uom: 'PZA',
          costo: 100.00
        }
      });
      console.log('✓ Producto de prueba creado:', testSku);
    } else {
      console.log('✓ Producto de prueba ya existe:', testSku);
    }

    // 2. Agregar códigos equivalentes de prueba
    const testCodes = [
      { sistema: 'SAP', codigo: 'SAP001', descripcion: 'Código SAP' },
      { sistema: 'ERP_TEST', codigo: 'ERP123', descripcion: 'Código ERP de prueba' }
    ];

    for (const code of testCodes) {
      try {
        const id = require('crypto').randomUUID();
        await prisma.$executeRaw`
          INSERT INTO "ProductoCodigoEquivalente" ("id", "productoId", "sistema", "codigo", "descripcion")
          VALUES (${id}::uuid, ${testProduct.sku}::uuid, ${code.sistema}, ${code.codigo}, ${code.descripcion})
        `;
        console.log(`✓ Código equivalente agregado: ${code.sistema} - ${code.codigo}`);
      } catch (e) {
        if (e.message.includes('duplicate key') || e.message.includes('unique constraint')) {
          console.log(`✓ Código ya existe: ${code.sistema} - ${code.codigo}`);
        } else {
          console.log(`⚠ Error agregando código ${code.codigo}:`, e.message);
        }
      }
    }

    // 3. Probar búsqueda por códigos equivalentes
    console.log('\n--- Probando búsqueda por códigos equivalentes ---');
    
    const searchTests = ['SAP001', 'ERP123', 'SAP', 'ERP_TEST'];
    
    for (const searchTerm of searchTests) {
      console.log(`\nBuscando: "${searchTerm}"`);
      
      const equivalentMatches = await prisma.$queryRaw`
        SELECT DISTINCT "productoId" 
        FROM "ProductoCodigoEquivalente"
        WHERE LOWER("sistema") LIKE ${`%${searchTerm.toLowerCase()}%`} 
           OR LOWER("codigo") LIKE ${`%${searchTerm.toLowerCase()}%`}
           OR LOWER("descripcion") LIKE ${`%${searchTerm.toLowerCase()}%`}
      `;
      
      console.log('Productos encontrados por códigos:', equivalentMatches.map(m => m.productoId));
      
      if (equivalentMatches.length > 0) {
        const products = await prisma.producto.findMany({
          where: {
            OR: [
              { nombre: { contains: searchTerm, mode: 'insensitive' } },
              { sku: { contains: searchTerm, mode: 'insensitive' } },
              { sku: { in: equivalentMatches.map(m => m.productoId) } }
            ]
          },
          select: { sku: true, nombre: true }
        });
        
        console.log('Resultado final:', products);
      }
    }

    console.log('\n✅ Prueba de búsqueda por códigos equivalentes completada');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEquivalentCodesSearch();