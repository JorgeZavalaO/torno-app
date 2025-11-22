import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔄 Iniciando actualización de códigos de herramientas...\n");

    // Obtener todas las herramientas agrupadas por producto
    const herramientas = await prisma.toolInstance.findMany({
      include: { producto: true },
      orderBy: [{ productoId: "asc" }, { fechaAlta: "asc" }],
    });

    if (herramientas.length === 0) {
      console.log("ℹ️  No hay herramientas para actualizar");
      return;
    }

    console.log(`📊 Total de herramientas encontradas: ${herramientas.length}\n`);

    let updateCount = 0;
    let currentSKU = "";
    let sequence = 0;

    // Agrupar por producto y actualizar secuencialmente
    for (const herramienta of herramientas) {
      // Reiniciar contador cuando cambia el SKU
      if (herramienta.productoId !== currentSKU) {
        currentSKU = herramienta.productoId;
        sequence = 1;
        console.log(`\n📝 Procesando producto: ${currentSKU}`);
      } else {
        sequence++;
      }

      // Generar nuevo código: SKU-000001, SKU-000002, etc.
      const nuevocodigo = `${currentSKU}-${String(sequence).padStart(6, "0")}`;

      // Verificar si el código ya es correcto
      if (herramienta.codigo === nuevocodigo) {
        console.log(`  ✓ ${herramienta.codigo} (sin cambios)`);
        updateCount++;
        continue;
      }

      // Actualizar código
      await prisma.toolInstance.update({
        where: { id: herramienta.id },
        data: { codigo: nuevocodigo },
      });

      console.log(`  ✅ ${herramienta.codigo} → ${nuevocodigo}`);
      updateCount++;
    }

    console.log(
      `\n✨ Actualización completada: ${updateCount} herramientas procesadas`
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
