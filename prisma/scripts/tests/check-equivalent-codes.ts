#!/usr/bin/env node

/**
 * Script para verificar el contenido de la tabla ProductoCodigoEquivalente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEquivalentCodes() {
  try {
    console.log('🔍 Verificando tabla ProductoCodigoEquivalente...');
    
    // Contar registros
    const count = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "ProductoCodigoEquivalente"
    `;
    
    console.log(`📊 Total de códigos equivalentes: ${count[0].count}`);
    
    // Mostrar algunos registros
    const records = await prisma.$queryRaw<Array<{
      id: string;
      productoId: string;
      sistema: string;
      codigo: string;
      descripcion: string | null;
      createdAt: Date;
    }>>`
      SELECT * FROM "ProductoCodigoEquivalente" 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `;
    
    if (records.length > 0) {
      console.log('\n📋 Últimos registros:');
      records.forEach((record, idx) => {
        console.log(`${idx + 1}. SKU: ${record.productoId} | Sistema: ${record.sistema} | Código: ${record.codigo}`);
        if (record.descripcion) console.log(`   Descripción: ${record.descripcion}`);
        console.log(`   Creado: ${record.createdAt}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No hay códigos equivalentes registrados');
    }
    
    // Verificar productos con códigos equivalentes
    const productsWithCodes = await prisma.$queryRaw<Array<{
      productoId: string;
      count: bigint;
    }>>`
      SELECT "productoId", COUNT(*) as count 
      FROM "ProductoCodigoEquivalente" 
      GROUP BY "productoId"
      ORDER BY count DESC
    `;
    
    if (productsWithCodes.length > 0) {
      console.log('🏷️  Productos con códigos equivalentes:');
      productsWithCodes.forEach(p => {
        console.log(`   ${p.productoId}: ${p.count} códigos`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  checkEquivalentCodes();
}

export {};