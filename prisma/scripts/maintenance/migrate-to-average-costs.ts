/**
 * Script de migración para aplicar costo promedio ponderado a productos existentes
 * 
 * Ejecutar con: npx tsx prisma/migrate-to-average-costs.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando migración a costos promedio ponderados...");
  
  const productos = await prisma.producto.findMany({
    select: { sku: true, nombre: true, costo: true }
  });

  console.log(`📦 Encontrados ${productos.length} productos`);
  
  let updatedCount = 0;
  let skippedCount = 0;

  for (const producto of productos) {
    // Obtener movimientos de ingreso por compra para este producto
    const movimientos = await prisma.movimiento.findMany({
      where: { 
        productoId: producto.sku, 
        tipo: "INGRESO_COMPRA",
        cantidad: { gt: 0 }
      },
      orderBy: { fecha: "desc" },
      take: 10, // Últimos 10 movimientos
      select: { cantidad: true, costoUnitario: true, fecha: true }
    });

    if (movimientos.length === 0) {
      console.log(`⏩ ${producto.sku} (${producto.nombre}): Sin historial de compras - manteniendo costo actual S/${producto.costo}`);
      skippedCount++;
      continue;
    }

    // Calcular promedio ponderado
    const totalValue = movimientos.reduce((acc, mov) => 
      acc + (Number(mov.cantidad) * Number(mov.costoUnitario)), 0
    );
    const totalQuantity = movimientos.reduce((acc, mov) => 
      acc + Number(mov.cantidad), 0
    );

    const currentCost = Number(producto.costo);
    const averageCost = Math.round((totalValue / totalQuantity) * 100) / 100;

    if (Math.abs(currentCost - averageCost) < 0.01) {
      console.log(`✅ ${producto.sku}: Costo ya es correcto S/${currentCost.toFixed(2)}`);
      skippedCount++;
      continue;
    }

    await prisma.producto.update({
      where: { sku: producto.sku },
      data: { costo: averageCost }
    });

    console.log(`📊 ${producto.sku} (${producto.nombre}): S/${currentCost.toFixed(2)} → S/${averageCost.toFixed(2)} (${movimientos.length} compras)`);
    updatedCount++;
  }

  console.log("\n🎉 Migración completada!");
  console.log(`   • ${updatedCount} productos actualizados`);
  console.log(`   • ${skippedCount} productos sin cambios`);
  console.log(`   • Total procesados: ${productos.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error durante la migración:", e);
    await prisma.$disconnect();
    process.exit(1);
  });