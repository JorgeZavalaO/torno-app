const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const codigo = process.argv[2] || 'AED';
  const tipo = 'MONEDA';

  const updated = await prisma.configuracionCatalogo.updateMany({
    where: { tipo, codigo },
    data: { activo: true },
  });

  console.log(`Updated ${updated.count} rows for ${tipo} ${codigo}`);
  const items = await prisma.configuracionCatalogo.findMany({ where: { tipo }, orderBy: { orden: 'asc' } });
  console.log('Monedas now:');
  items.forEach(it => console.log(`- ${it.codigo} | activo=${it.activo}`));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });