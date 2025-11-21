
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.productoVidaCategoria.deleteMany({
    where: {
      vidaUtil: 100.5 // The value I used
    }
  });
  console.log('Deleted:', deleted.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
