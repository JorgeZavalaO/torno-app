import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const email = process.argv[2];
if (!email) {
  console.error("Uso: pnpm grant:admin <email>");
  process.exit(1);
}

async function main() {
  const admin = await prisma.role.upsert({
    where: { name: "admin" },
    create: { name: "admin", description: "Administrador" },
    update: {},
  });

  const user = await prisma.userProfile.upsert({
    where: { email },
    create: { email, stackUserId: `bootstrap-${Date.now()}` },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: admin.id } },
    create: { userId: user.id, roleId: admin.id },
    update: {},
  });

  console.log(`OK: ${email} ahora es admin`);
}

main().finally(() => prisma.$disconnect());
