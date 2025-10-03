import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixCostParamsGroup() {
  console.log("\n🔧 Actualizando grupo de parámetros de costos...\n");

  // Actualizar parámetros del grupo "costos" a "costos_compartidos"
  const result = await prisma.costingParam.updateMany({
    where: {
      group: "costos",
    },
    data: {
      group: "costos_compartidos",
    },
  });

  console.log(`✅ ${result.count} parámetros actualizados de "costos" a "costos_compartidos"\n`);

  // Verificar resultados
  const params = await prisma.costingParam.findMany({
    where: {
      group: "costos_compartidos",
    },
    select: {
      key: true,
      label: true,
      group: true,
    },
  });

  console.log("📋 Parámetros en grupo 'costos_compartidos':");
  for (const param of params) {
    console.log(`  - ${param.key}: ${param.label}`);
  }

  console.log("\n✅ Actualización completada\n");
  
  await prisma.$disconnect();
}

fixCostParamsGroup().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
