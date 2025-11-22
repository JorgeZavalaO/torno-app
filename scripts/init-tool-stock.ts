
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Obtener todos los productos que son herramientas
    const herramientas = await prisma.producto.findMany({
      where: {
        categoria: {
          in: ["HERRAMIENTA", "HERRAMIENTA_CORTE"],
        },
      },
      select: { sku: true, nombre: true },
    });

    console.log(`Encontradas ${herramientas.length} herramientas`);

    if (herramientas.length === 0) {
      console.log("No hay herramientas para procesar");
      return;
    }

    // Crear movimientos de ingreso para cada herramienta
    let createdCount = 0;
    const costoBase = 10; // Costo por defecto

    for (const herramienta of herramientas) {
      // Verificar si ya tiene stock
      const existingStock = await prisma.movimiento.aggregate({
        where: { productoId: herramienta.sku },
        _sum: { cantidad: true },
      });

      const currentStock = Number(existingStock._sum.cantidad || 0);

      // Si ya tiene stock, no agregar más
      if (currentStock > 0) {
        console.log(`⏭️  ${herramienta.nombre} (${herramienta.sku}) ya tiene stock: ${currentStock}`);
        continue;
      }

      // Crear movimiento de ajuste inicial de 100 unidades
      await prisma.movimiento.create({
        data: {
          productoId: herramienta.sku,
          tipo: "INGRESO_AJUSTE",
          cantidad: 100,
          costoUnitario: costoBase,
          nota: "Stock Inicial - Script de carga masiva",
        },
      });

      // Actualizar el costo del producto
      await prisma.producto.update({
        where: { sku: herramienta.sku },
        data: { costo: costoBase },
      });

      // 🆕 Crear instancias de herramientas automáticamente (100 unidades)
      for (let i = 1; i <= 100; i++) {
        const codigo = `${herramienta.sku}-${String(i).padStart(6, "0")}`;

        await prisma.toolInstance.create({
          data: {
            productoId: herramienta.sku,
            codigo,
            estado: "NUEVA",
            ubicacion: "Almacén",
            costoInicial: costoBase,
          },
        });
      }

      createdCount++;
      console.log(`✅ ${herramienta.nombre} (${herramienta.sku}) - Stock: 100 unidades + 100 ToolInstance creadas`);
    }

    console.log(`\n✨ Proceso completado: ${createdCount} herramientas actualizadas`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
