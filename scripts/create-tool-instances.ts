import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

async function main() {
  try {
    console.log("🔄 Creando instancias de herramientas desde stock existente...\n");

    // Obtener todos los productos que son herramientas con stock existente
    const herramientas = await prisma.producto.findMany({
      where: {
        categoria: {
          in: ["HERRAMIENTA", "HERRAMIENTA_CORTE"],
        },
      },
      select: { sku: true, nombre: true, costo: true },
    });

    console.log(`📊 Total de herramientas encontradas: ${herramientas.length}\n`);

    if (herramientas.length === 0) {
      console.log("No hay herramientas para procesar");
      return;
    }

    let createdCount = 0;

    for (const herramienta of herramientas) {
      // Obtener stock actual
      const movimientos = await prisma.movimiento.aggregate({
        where: { productoId: herramienta.sku },
        _sum: { cantidad: true },
      });

      const stock = Number(movimientos._sum.cantidad || 0);

      if (stock <= 0) {
        console.log(`⏭️  ${herramienta.nombre} (${herramienta.sku}) - Sin stock`);
        continue;
      }

      // Verificar cuántas instancias ya existen
      const existingInstances = await prisma.toolInstance.count({
        where: { productoId: herramienta.sku },
      });

      if (existingInstances >= stock) {
        console.log(
          `✓ ${herramienta.nombre} (${herramienta.sku}) - Ya tiene ${existingInstances} instancias para ${stock} unidades`
        );
        continue;
      }

      // Crear instancias para completar el stock
      const instancesToCreate = Math.floor(stock) - existingInstances;
      const startSequence = existingInstances + 1;
      const costoValue = herramienta.costo ? Number(herramienta.costo) : 0;

      for (let i = 0; i < instancesToCreate; i++) {
        const sequence = startSequence + i;
        const codigo = `${herramienta.sku}-${String(sequence).padStart(6, "0")}`;

        try {
          await prisma.toolInstance.create({
            data: {
              productoId: herramienta.sku,
              codigo,
              estado: "NUEVA",
              ubicacion: "Almacén",
              costoInicial: D(costoValue),
            },
          });
        } catch (err) {
          // Ignorar si el código ya existe
          if ((err as { code?: string })?.code !== "P2002") {
            throw err;
          }
        }
      }

      createdCount += instancesToCreate;
      console.log(
        `✅ ${herramienta.nombre} (${herramienta.sku}) - Creadas ${instancesToCreate} instancias (total: ${stock})`
      );
    }

    console.log(`\n✨ Proceso completado: ${createdCount} instancias creadas`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
