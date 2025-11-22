import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 Verificando códigos de herramientas...\n");

    // Obtener todas las herramientas agrupadas por producto
    const herramientas = await prisma.toolInstance.findMany({
      include: { producto: { select: { nombre: true } } },
      orderBy: [{ productoId: "asc" }, { fechaAlta: "asc" }],
    });

    if (herramientas.length === 0) {
      console.log("ℹ️  No hay herramientas registradas");
      return;
    }

    let currentSKU = "";
    let productCount = 0;
    const totalByProduct: Record<string, number> = {};

    for (const herramienta of herramientas) {
      if (herramienta.productoId !== currentSKU) {
        if (currentSKU) console.log("");
        currentSKU = herramienta.productoId;
        productCount++;
        totalByProduct[currentSKU] = 0;
        console.log(
          `📦 Producto: ${currentSKU} (${herramienta.producto?.nombre || "N/A"})`
        );
      }

      totalByProduct[currentSKU]++;
      const status =
        herramienta.estado === "NUEVA" ? "✨" : "⚙️ ";
      console.log(
        `  ${status} ${herramienta.codigo} - Estado: ${herramienta.estado} - Costo: $${Number(herramienta.costoInicial).toFixed(2)}`
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMEN POR PRODUCTO:");
    console.log("=".repeat(60));

    for (const [sku, count] of Object.entries(totalByProduct)) {
      console.log(`  ${sku}: ${count} herramientas`);
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Total de productos: ${productCount}`);
    console.log(`Total de herramientas: ${herramientas.length}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
