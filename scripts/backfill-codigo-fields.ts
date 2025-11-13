/**
 * Script de backfill para asignar códigos retroactivos a registros sin código.
 * - Solicitudes de Compra: SC-YYYY-XXXX (basado en año de createdAt)
 * - Cotizaciones: CO-YYYY-XXXX (basado en año de createdAt)
 * 
 * Ejecutar con: npx tsx scripts/backfill-codigo-fields.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando backfill de códigos...\n");

  // 1. Backfill SolicitudCompra
  console.log("📋 Procesando Solicitudes de Compra...");
  const scs = await prisma.solicitudCompra.findMany({
    where: { codigo: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });

  console.log(`   Encontradas ${scs.length} solicitudes sin código.`);

  // Agrupar por año
  const scsByYear = new Map<number, typeof scs>();
  for (const sc of scs) {
    const year = sc.createdAt.getFullYear();
    if (!scsByYear.has(year)) scsByYear.set(year, []);
    scsByYear.get(year)!.push(sc);
  }

  let scUpdated = 0;
  for (const [year, records] of scsByYear.entries()) {
    console.log(`   Año ${year}: ${records.length} registros`);
    
    // Obtener el último número usado en ese año
    const prefix = `SC-${year}-`;
    const lastWithCode = await prisma.solicitudCompra.findFirst({
      where: { codigo: { startsWith: prefix } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    });
    
    let lastNum = 0;
    if (lastWithCode?.codigo) {
      const parts = lastWithCode.codigo.split("-");
      lastNum = parseInt(parts[2] || "0", 10);
    }

    // Asignar códigos secuenciales
    for (const sc of records) {
      lastNum++;
      const codigo = `${prefix}${String(lastNum).padStart(4, "0")}`;
      
      try {
        await prisma.solicitudCompra.update({
          where: { id: sc.id },
          data: { codigo },
        });
        scUpdated++;
        console.log(`   ✓ ${codigo} asignado`);
      } catch (error) {
        console.error(`   ✗ Error asignando ${codigo}:`, error);
      }
    }
  }

  console.log(`\n✅ Solicitudes de Compra actualizadas: ${scUpdated}/${scs.length}\n`);

  // 2. Backfill Cotizacion
  console.log("💰 Procesando Cotizaciones...");
  const cotizaciones = await prisma.cotizacion.findMany({
    where: { codigo: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });

  console.log(`   Encontradas ${cotizaciones.length} cotizaciones sin código.`);

  // Agrupar por año
  const cotizacionesByYear = new Map<number, typeof cotizaciones>();
  for (const cot of cotizaciones) {
    const year = cot.createdAt.getFullYear();
    if (!cotizacionesByYear.has(year)) cotizacionesByYear.set(year, []);
    cotizacionesByYear.get(year)!.push(cot);
  }

  let cotUpdated = 0;
  for (const [year, records] of cotizacionesByYear.entries()) {
    console.log(`   Año ${year}: ${records.length} registros`);
    
    // Obtener el último número usado en ese año
    const prefix = `CO-${year}-`;
    const lastWithCode = await prisma.cotizacion.findFirst({
      where: { codigo: { startsWith: prefix } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    });
    
    let lastNum = 0;
    if (lastWithCode?.codigo) {
      const parts = lastWithCode.codigo.split("-");
      lastNum = parseInt(parts[2] || "0", 10);
    }

    // Asignar códigos secuenciales
    for (const cot of records) {
      lastNum++;
      const codigo = `${prefix}${String(lastNum).padStart(4, "0")}`;
      
      try {
        await prisma.cotizacion.update({
          where: { id: cot.id },
          data: { codigo },
        });
        cotUpdated++;
        console.log(`   ✓ ${codigo} asignado`);
      } catch (error) {
        console.error(`   ✗ Error asignando ${codigo}:`, error);
      }
    }
  }

  console.log(`\n✅ Cotizaciones actualizadas: ${cotUpdated}/${cotizaciones.length}\n`);

  // 3. Verificación final
  console.log("🔍 Verificación final...");
  const scSinCodigo = await prisma.solicitudCompra.count({ where: { codigo: null } });
  const cotSinCodigo = await prisma.cotizacion.count({ where: { codigo: null } });

  console.log(`   Solicitudes sin código: ${scSinCodigo}`);
  console.log(`   Cotizaciones sin código: ${cotSinCodigo}`);

  if (scSinCodigo === 0 && cotSinCodigo === 0) {
    console.log("\n🎉 ¡Backfill completado! Todos los registros tienen código asignado.");
  } else {
    console.log("\n⚠️  Aún hay registros sin código. Revisa los errores anteriores.");
  }
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
