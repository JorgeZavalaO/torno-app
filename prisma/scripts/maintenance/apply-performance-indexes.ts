#!/usr/bin/env node

/**
 * Script para aplicar índices de rendimiento adicionales
 * Ejecutar con: npx tsx prisma/apply-performance-indexes.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyPerformanceIndexes() {
  try {
    console.log('🚀 Aplicando índices de rendimiento...');
    
    // Leer el archivo SQL de índices
    const sqlPath = path.join(__dirname, 'performance_indexes.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    // Dividir por líneas y filtrar comentarios y líneas vacías
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`);
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement + ';');
          console.log(`✅ ${index + 1}/${statements.length} - Índice aplicado`);
        } catch (error) {
          // Ignorar errores de índices ya existentes
          if (error instanceof Error && error.message?.includes('already exists')) {
            console.log(`⚠️  ${index + 1}/${statements.length} - Índice ya existe`);
          } else {
            console.error(`❌ ${index + 1}/${statements.length} - Error:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }
    
    // Verificar algunos índices críticos
    console.log('\n🔍 Verificando índices críticos...');
    
    const indexQueries = [
      "SELECT indexname FROM pg_indexes WHERE tablename = 'ParteProduccion' AND indexname LIKE '%fecha%'",
      "SELECT indexname FROM pg_indexes WHERE tablename = 'Movimiento' AND indexname LIKE '%tipo%'",
      "SELECT indexname FROM pg_indexes WHERE tablename = 'OrdenTrabajo' AND indexname LIKE '%prioridad%'",
    ];
    
    for (const query of indexQueries) {
      try {
        const result = await prisma.$queryRawUnsafe(query);
        console.log(`📊 Índices encontrados:`, result);
      } catch (error) {
        console.log('⚠️  Error verificando índices:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Actualizar estadísticas de la base de datos
    console.log('\n📈 Actualizando estadísticas de la base de datos...');
    await prisma.$executeRaw`ANALYZE`;
    
    console.log('✨ ¡Optimización completada exitosamente!');
    
  } catch (error) {
    console.error('💥 Error aplicando índices:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  applyPerformanceIndexes();
}

export { applyPerformanceIndexes };
