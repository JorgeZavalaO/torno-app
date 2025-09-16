const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.configuracionCatalogo.findMany({
    where: { tipo: 'MONEDA' },
    orderBy: { orden: 'asc' },
  });

  console.log('Monedas en DB (count=' + items.length + '):');
  for (const it of items) {
    console.log(`- ${it.codigo} | ${it.nombre} | color=${it.color} | icono=${it.icono} | activo=${it.activo}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e);
  prisma.$disconnect();
  process.exit(1);
});