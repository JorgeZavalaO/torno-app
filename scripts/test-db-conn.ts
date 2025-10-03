import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    log: ["error"],
  });

  console.log("DATABASE_URL:", (process.env.DATABASE_URL || "").replace(/:(.*?)@/, ":****@"));

  const ping = await prisma.$queryRawUnsafe<{ now: Date }[]>("select now() as now");
  console.log("Ping ok:", ping[0]?.now);

  const param = await prisma.costingParam.findFirst();
  console.log("CostingParam sample:", param ? { key: param.key, type: param.type, valueNumber: param.valueNumber } : null);

  const cats = await prisma.machineCostingCategory.findMany({ select: { categoria: true, laborCost: true } });
  console.log("Machine categories:", cats);

  await prisma.$disconnect();
}

main().catch((e) => { console.error("DB test error:", e); process.exit(1); });
