import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateKwhRateLabel() {
  console.log("\n🔧 Actualizando parámetro kwhRate...\n");

  // Actualizar el parámetro kwhRate
  const result = await prisma.costingParam.updateMany({
    where: {
      key: "kwhRate",
    },
    data: {
      label: "Costo de energía eléctrica por hora",
      unit: "USD/hora",
    },
  });

  console.log(`✅ ${result.count} parámetro(s) actualizado(s)\n`);

  // Verificar el resultado
  const param = await prisma.costingParam.findFirst({
    where: {
      key: "kwhRate",
    },
  });

  if (param) {
    console.log("📋 Parámetro actualizado:");
    console.log(`  Key: ${param.key}`);
    console.log(`  Label: ${param.label}`);
    console.log(`  Unit: ${param.unit}`);
    console.log(`  Value: ${param.valueNumber} USD/hora`);
    console.log(`  Group: ${param.group}`);
  }

  console.log("\n✅ Actualización completada\n");
  console.log("ℹ️  Cambio realizado:");
  console.log("  - Antes: 'Costo de energía eléctrica (LUZ)' | 'USD/hora (2.50 PEN)'");
  console.log("  - Ahora: 'Costo de energía eléctrica por hora' | 'USD/hora'");
  console.log("\n💡 Este parámetro ahora representa el costo promedio de electricidad");
  console.log("   por hora de operación, sin necesidad de calcular kWh específicos.\n");
  
  await prisma.$disconnect();
}

updateKwhRateLabel().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
