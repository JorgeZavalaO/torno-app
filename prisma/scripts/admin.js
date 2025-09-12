#!/usr/bin/env node

/**
 * 🚀 Script principal de administración de Prisma
 * Punto de entrada para todos los scripts organizados
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCRIPTS = {
  // 🌱 Seeding
  seed: {
    path: '../seed.ts',
    desc: 'Ejecutar seed principal del sistema (usuarios, permisos, roles)'
  },

  // 🔐 Permisos
  'permissions:all': {
    path: 'permissions/add-all-permissions.ts',
    desc: 'Crear todos los permisos y asignarlos a admin'
  },
  'permissions:verify': {
    path: 'permissions/verify-permissions.ts',
    desc: 'Verificar configuración actual de permisos'
  },
  'permissions:grant-admin': {
    path: 'permissions/grant-admin.ts',
    desc: 'Asignar rol admin a un usuario (requiere email como argumento)'
  },
  'permissions:catalogos': {
    path: 'permissions/add-catalogos-permissions.ts',
    desc: 'Añadir permisos específicos de catálogos'
  },

  // 🔧 Mantenimiento
  'maintenance:indexes': {
    path: 'maintenance/apply-performance-indexes.ts',
    desc: 'Aplicar índices de rendimiento para optimizar consultas'
  },
  'maintenance:costs': {
    path: 'maintenance/migrate-to-average-costs.ts',
    desc: 'Migrar sistema de costeo a promedio ponderado'
  },
  'maintenance:equivalents': {
    path: 'maintenance/create-equivalents-table.ts',
    desc: 'Crear tabla de códigos equivalentes'
  },

  // 🧪 Testing
  'test:machines': {
    path: 'tests/test-machines-metrics.ts',
    desc: 'Probar métricas y KPIs de máquinas'
  },
  'test:create-data': {
    path: 'tests/create-test-data.ts',
    desc: 'Crear datos de prueba para desarrollo'
  },
  'test:cleanup': {
    path: 'tests/cleanup-test-data.ts',
    desc: 'Limpiar todos los datos de prueba'
  },
  'test:products': {
    path: 'tests/test-create-product.ts',
    desc: 'Probar creación de productos con códigos equivalentes'
  },
  'test:search': {
    path: 'tests/test-search.js',
    desc: 'Probar funcionalidad de búsqueda por códigos equivalentes'
  },
  'test:codes': {
    path: 'tests/check-equivalent-codes.ts',
    desc: 'Verificar contenido de códigos equivalentes'
  }
};

function showHelp() {
  console.log('🚀 TornoApp - Script de Administración Prisma\n');
  console.log('Uso: node admin.js <comando> [argumentos]\n');
  
  console.log('📋 Comandos disponibles:\n');
  
  // Agrupar por categoría
  const categories = {
    '🌱 Seeding': ['seed'],
    '🔐 Permisos': ['permissions:all', 'permissions:verify', 'permissions:grant-admin', 'permissions:catalogos'],
    '🔧 Mantenimiento': ['maintenance:indexes', 'maintenance:costs', 'maintenance:equivalents'],
    '🧪 Testing': ['test:machines', 'test:create-data', 'test:cleanup', 'test:products', 'test:search', 'test:codes']
  };

  Object.entries(categories).forEach(([category, commands]) => {
    console.log(`${category}:`);
    commands.forEach(cmd => {
      const script = SCRIPTS[cmd];
      console.log(`  ${cmd.padEnd(25)} - ${script.desc}`);
    });
    console.log('');
  });

  console.log('📚 Ejemplos de uso:');
  console.log('  node admin.js seed                           # Seed completo del sistema');
  console.log('  node admin.js permissions:all                # Crear todos los permisos');
  console.log('  node admin.js permissions:grant-admin user@email.com  # Asignar admin a usuario');
  console.log('  node admin.js maintenance:indexes            # Aplicar índices de rendimiento');
  console.log('  node admin.js test:create-data               # Crear datos de prueba');
  console.log('');
  
  console.log('💡 También puedes usar los comandos de package.json:');
  console.log('  pnpm db:seed                    # Equivale a: node admin.js seed');
  console.log('  pnpm grant:permissions          # Equivale a: node admin.js permissions:all');
  console.log('  pnpm test:create-data           # Equivale a: node admin.js test:create-data');
}

function runScript(command, args = []) {
  const script = SCRIPTS[command];
  
  if (!script) {
    console.error(`❌ Comando no encontrado: ${command}`);
    console.log('');
    showHelp();
    process.exit(1);
  }

  const scriptPath = join(__dirname, script.path);
  const cmd = `npx tsx "${scriptPath}" ${args.join(' ')}`;
  
  console.log(`🚀 Ejecutando: ${command}`);
  console.log(`📄 Descripción: ${script.desc}`);
  console.log(`⚡ Comando: ${cmd}\n`);

  try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`\n✅ ${command} completado exitosamente!`);
  } catch (error) {
    console.error(`\n❌ Error ejecutando ${command}:`, error.message);
    process.exit(1);
  }
}

// Main logic
const [,, command, ...args] = process.argv;

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

runScript(command, args);