#!/usr/bin/env node

/**
 * Crea la tabla ProductoCodigoEquivalente si aún no existe.
 * Úsalo como alternativa temporal a Prisma Migrate cuando hay drift o problemas de generate.
 * Ejecutar con: npx tsx prisma/create-equivalents-table.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Creando tabla ProductoCodigoEquivalente si no existe...');

    const statements = [
      `CREATE TABLE IF NOT EXISTS "ProductoCodigoEquivalente" (
        id uuid PRIMARY KEY,
        "productoId" text NOT NULL,
        sistema text NOT NULL,
        codigo text NOT NULL,
        descripcion text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_producto_equivalente FOREIGN KEY ("productoId") REFERENCES "Producto"("sku") ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_pce_productoId ON "ProductoCodigoEquivalente"("productoId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_pce_sistema_codigo ON "ProductoCodigoEquivalente"(sistema, codigo)`,
    ];

    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log('Tabla y índices verificados ✅');
  } catch (e) {
    console.error('Error creando la tabla:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export {};
