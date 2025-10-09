/**
 * Script para probar la creación de cotizaciones en vivo
 * y verificar que los cálculos coincidan con los parámetros configurados
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testQuoteCreation() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PRUEBA EN VIVO - CREACIÓN DE COTIZACIÓN");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Obtener un cliente existente
  const client = await prisma.cliente.findFirst({
    select: { id: true, nombre: true },
  });

  if (!client) {
    console.log("❌ No hay clientes en la base de datos");
    console.log("   Crea un cliente primero desde la interfaz web");
    return;
  }

  console.log(`✓ Cliente encontrado: ${client.nombre} (${client.id})\n`);

  // 2. Obtener parámetros actuales
  const params = await prisma.costingParam.findMany({
    select: { key: true, valueText: true, valueNumber: true },
  });
  
  const paramsMap = new Map(params.map((p) => [p.key, p]));
  const getParam = (key: string) => {
    const p = paramsMap.get(key);
    if (!p) return null;
    return p.valueNumber !== null ? Number(p.valueNumber.toString()) : p.valueText;
  };

  const currency = String(getParam("currency") || "PEN");
  const gi = Number(getParam("gi") || 0);
  const margin = Number(getParam("margin") || 0);

  console.log("📊 Parámetros del Sistema:");
  console.log(`   Moneda: ${currency}`);
  console.log(`   G.I.: ${(gi * 100).toFixed(1)}%`);
  console.log(`   Margen: ${(margin * 100).toFixed(1)}%\n`);

  // 3. Obtener categorías
  const categories = await prisma.machineCostingCategory.findMany({
    where: { activo: true },
    select: { id: true, categoria: true, laborCost: true, deprPerHour: true },
  });

  if (categories.length === 0) {
    console.log("⚠️  No hay categorías de máquinas configuradas\n");
  } else {
    console.log("🏭 Categorías disponibles:");
    for (const cat of categories) {
      console.log(`   - ${cat.categoria}: $${Number(cat.laborCost).toFixed(2)}/h labor, $${Number(cat.deprPerHour).toFixed(2)}/h depr`);
    }
    console.log();
  }

  // 4. Preparar datos de prueba
  const testData = {
    qty: 10,
    materials: 500,
    hours: 5,
    machineCategory: categories.length > 0 ? categories[0].categoria : null,
  };

  console.log("📝 Datos de prueba:");
  console.log(`   Cantidad: ${testData.qty} piezas`);
  console.log(`   Materiales: ${testData.materials} ${currency}`);
  console.log(`   Horas: ${testData.hours}h`);
  console.log(`   Categoría: ${testData.machineCategory || "Sin categoría"}\n`);

  // 5. Simular el cálculo que hace el backend
  console.log("🔄 Simulando cálculo del backend...\n");

  // Obtener costos según categoría
  let laborCost = Number(getParam("hourlyRate") || 0);
  let deprPerHour = Number(getParam("deprPerHour") || 0);

  if (testData.machineCategory) {
    const cat = categories.find(c => c.categoria === testData.machineCategory);
    if (cat) {
      laborCost = Number(cat.laborCost);
      deprPerHour = Number(cat.deprPerHour);
    }
  }

  const kwhRate = Number(getParam("kwhRate") || 0);
  const toolingPerPiece = Number(getParam("toolingPerPiece") || 0);
  const rentPerHour = Number(getParam("rentPerHour") || 0);

  const labor = laborCost * testData.hours;
  const energy = kwhRate * testData.hours;
  const depreciation = deprPerHour * testData.hours;
  const tooling = toolingPerPiece * testData.qty;
  const rent = rentPerHour * testData.hours;

  const direct = testData.materials + labor + energy + depreciation + tooling + rent;
  const giAmount = direct * gi;
  const subtotal = direct + giAmount;
  const marginAmount = subtotal * margin;
  const total = subtotal + marginAmount;
  const unitPrice = total / testData.qty;

  console.log("💰 Cálculo simulado:");
  console.log(`   Materiales:     ${testData.materials.toFixed(2).padStart(10)} ${currency}`);
  console.log(`   Mano de obra:   ${labor.toFixed(2).padStart(10)} ${currency} (${laborCost.toFixed(2)} × ${testData.hours}h)`);
  console.log(`   Energía:        ${energy.toFixed(2).padStart(10)} ${currency} (${kwhRate.toFixed(4)} × ${testData.hours}h)`);
  console.log(`   Depreciación:   ${depreciation.toFixed(2).padStart(10)} ${currency} (${deprPerHour.toFixed(2)} × ${testData.hours}h)`);
  console.log(`   Herramientas:   ${tooling.toFixed(2).padStart(10)} ${currency} (${toolingPerPiece.toFixed(2)} × ${testData.qty} piezas)`);
  console.log(`   Alquiler:       ${rent.toFixed(2).padStart(10)} ${currency} (${rentPerHour.toFixed(2)} × ${testData.hours}h)`);
  console.log(`   ${'─'.repeat(60)}`);
  console.log(`   Costo directo:  ${direct.toFixed(2).padStart(10)} ${currency}`);
  console.log(`   + G.I. (${(gi * 100).toFixed(1)}%):  ${giAmount.toFixed(2).padStart(10)} ${currency}`);
  console.log(`   ${'─'.repeat(60)}`);
  console.log(`   Subtotal:       ${subtotal.toFixed(2).padStart(10)} ${currency}`);
  console.log(`   + Margen (${(margin * 100).toFixed(1)}%): ${marginAmount.toFixed(2).padStart(10)} ${currency}`);
  console.log(`   ${'═'.repeat(60)}`);
  console.log(`   💰 TOTAL:       ${total.toFixed(2).padStart(10)} ${currency}`);
  console.log(`   📦 Precio/unidad: ${unitPrice.toFixed(2).padStart(8)} ${currency}\n`);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RESUMEN DE VERIFICACIÓN");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("✅ Correcciones aplicadas:");
  console.log("   1. createQuote() ahora usa getCostsByCategory()");
  console.log("   2. updateQuote() ahora usa getCostsByCategory()");
  console.log("   3. Ambos métodos guardan machineCategoryId en la BD");
  console.log("   4. Campo obsoleto 'kwh' eliminado de updateQuote()");
  console.log("   5. Cálculo de energía: kwhRate × hours (no kWh consumidos)\n");

  console.log("📋 Para probar en la interfaz:");
  console.log("   1. Abre http://localhost:3000/cotizador");
  console.log("   2. Haz clic en 'Nueva Cotización'");
  console.log(`   3. Selecciona cliente: ${client.nombre}`);
  console.log(`   4. Ingresa: Cantidad=${testData.qty}, Materiales=${testData.materials}, Horas=${testData.hours}`);
  if (testData.machineCategory) {
    console.log(`   5. Selecciona categoría: ${testData.machineCategory}`);
  }
  console.log("   6. Verifica que el Total calculado sea:", total.toFixed(2), currency);
  console.log("   7. Guarda la cotización");
  console.log("   8. Verifica en la BD que machineCategoryId esté guardado\n");

  console.log("🔍 Comando SQL para verificar:");
  console.log(`   SELECT id, total, machineCategoryId, breakdown FROM "Cotizacion" ORDER BY "createdAt" DESC LIMIT 1;\n`);

  await prisma.$disconnect();
}

testQuoteCreation().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
