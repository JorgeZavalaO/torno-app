
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Get a machine category
  const category = await prisma.machineCostingCategory.findFirst();
  if (!category) {
    console.log('No machine category found');
    return;
  }
  console.log('Category:', category.categoria);

  // 2. Get a product (tool)
  const product = await prisma.producto.findFirst({
    where: { categoria: 'HERRAMIENTA' }
  });
  
  if (!product) {
    console.log('No tool product found');
    // Try any product
    const anyProduct = await prisma.producto.findFirst();
    if (!anyProduct) {
        console.log('No products found at all');
        return;
    }
    console.log('Using non-tool product for test:', anyProduct.sku);
    // We will use this one
  } else {
    console.log('Product:', product.sku);
  }

  const targetProduct = product || (await prisma.producto.findFirst());

  if (!targetProduct) return;

  // 3. Create the link
  // Check if exists first to avoid unique constraint error if re-run
  const existing = await prisma.productoVidaCategoria.findUnique({
    where: {
      productoId_machineCategoryId: {
        productoId: targetProduct.sku,
        machineCategoryId: category.id
      }
    }
  });

  if (existing) {
    console.log('Link already exists:', existing);
  } else {
    const newLink = await prisma.productoVidaCategoria.create({
      data: {
        productoId: targetProduct.sku,
        machineCategoryId: category.id,
        vidaUtil: 100.5 // Example value
      }
    });
    console.log('Created new link:', newLink);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
