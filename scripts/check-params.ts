import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkParams() {
  const params = await prisma.costingParam.findMany({
    where: {
      group: "costos_compartidos"
    },
    orderBy: {
      key: "asc"
    }
  });

  console.log("\n📋 Parámetros de Costos Compartidos:\n");
  
  for (const param of params) {
    const value = param.type === "TEXT" 
      ? param.valueText ?? "N/A"
      : `$${Number(param.valueNumber?.toString() ?? 0).toFixed(2)}`;
    
    console.log(`✅ ${param.key.padEnd(20)} = ${value.padEnd(10)} (${param.unit || 'N/A'})`);
  }
  
  console.log(`\n Total: ${params.length} parámetros\n`);
  
  await prisma.$disconnect();
}

checkParams();
