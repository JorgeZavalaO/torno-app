import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkParamGroups() {
  console.log("\n🔍 Verificando grupos de parámetros en la base de datos...\n");

  const params = await prisma.costingParam.findMany({
    select: {
      key: true,
      label: true,
      group: true,
    },
    orderBy: {
      group: "asc",
    },
  });

  // Agrupar por grupo
  const groupMap = new Map<string, typeof params>();
  
  for (const param of params) {
    const groupKey = param.group || "general";
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(param);
  }

  console.log("📊 Grupos encontrados:\n");
  for (const [group, items] of groupMap.entries()) {
    console.log(`\n  Grupo: "${group}" (${items.length} parámetros)`);
    for (const item of items) {
      console.log(`    - ${item.key}: ${item.label || "(sin etiqueta)"}`);
    }
  }

  console.log("\n✅ Verificación completada\n");
  
  await prisma.$disconnect();
}

checkParamGroups().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
