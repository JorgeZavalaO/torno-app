
import { prisma } from "../src/app/lib/prisma";
import { createToolInstance, mountToolOnMachine, updateToolStatus } from "../src/app/(protected)/inventario/tools-actions";
import { registerMachineProduction } from "../src/app/(protected)/inventario/tools-actions";

async function main() {
  console.log("🚀 Iniciando prueba de flujo completo de Herramientas...");

  // 1. Setup: Crear Cliente, Máquina, Producto (Herramienta), OT
  console.log("1. Setup: Creando datos de prueba...");
  
  const cliente = await prisma.cliente.create({
    data: {
      nombre: "Cliente Test Tool",
      ruc: `2000000000${Math.floor(Math.random()*10)}`,
    }
  });

  const machine = await prisma.maquina.create({
    data: {
      codigo: `TEST-M-${Date.now()}`,
      nombre: "Máquina de Prueba",
      estado: "ACTIVA",
      // costoHora eliminado
    }
  });
  console.log(`   - Máquina creada: ${machine.codigo}`);

  const product = await prisma.producto.create({
    data: {
      nombre: "Broca Test",
      sku: `BROCA-${Date.now()}`,
      categoria: "HERRAMIENTA_CORTE", // Corregido
      uom: "UNIDAD",
      costo: 50, // Corregido
      requiereTrazabilidad: true,
      vidaUtilEstimada: 100 // Vida útil estimada en piezas
    }
  });
  console.log(`   - Producto creado: ${product.sku} (Costo: $50, Vida: 100)`);

  const ot = await prisma.ordenTrabajo.create({
    data: {
      codigo: `OT-TEST-${Date.now()}`,
      clienteId: cliente.id, // Corregido
      estado: "IN_PROGRESS",
      costOverheads: 0,
      costTotal: 0
    }
  });
  console.log(`   - OT creada: ${ot.codigo}`);

  // 2. Crear Instancia de Herramienta
  console.log("\n2. Creando Instancia de Herramienta...");
  
  const fd = new FormData();
  fd.append("productoId", product.sku);
  fd.append("codigo", `T-${Date.now()}`);
  fd.append("costoInicial", "50");
  fd.append("ubicacion", "Almacén");

  // createToolInstance returns tool now
  const toolRes = await createToolInstance(fd);
  
  //
  if (!toolRes.ok || !toolRes.tool) throw new Error(`Error creando herramienta: ${toolRes.message}`);
  //
  const toolId = toolRes.tool.id;
  //
  console.log(`   - Herramienta creada: ${toolRes.tool.codigo}`);

  // 3. Montar Herramienta en Máquina
  console.log("\n3. Montando Herramienta en Máquina...");
  const mountRes = await mountToolOnMachine(toolId, machine.id);
  if (!mountRes.ok) throw new Error(`Error montando herramienta: ${mountRes.message}`);
  console.log("   - Herramienta montada correctamente");

  // Verificar estado
  const toolMounted = await prisma.toolInstance.findUnique({ where: { id: toolId } });
  if (toolMounted?.estado !== "EN_USO" || toolMounted.maquinaId !== machine.id) {
    throw new Error("Estado de herramienta incorrecto tras montaje");
  }

  // 4. Simular Producción (Desgaste)
  console.log("\n4. Simulando Producción (10 piezas)...");
  // Simulamos que se produjeron 10 piezas en esta máquina para la OT
  // El costo estimado debería ser: (CostoHerramienta / VidaEstimada) * Piezas
  // (50 / 100) * 10 = $0.5 * 10 = $5
  
  // Corregido orden de argumentos: otId, maquinaId, cantidad
  await registerMachineProduction(ot.id, machine.id, 10);
  console.log("   - Producción registrada");

  // Verificar desgaste
  const toolAfterProd = await prisma.toolInstance.findUnique({ where: { id: toolId } });
  console.log(`   - Vida Acumulada: ${toolAfterProd?.vidaAcumulada} (Esperado: 10)`);
  if (Number(toolAfterProd?.vidaAcumulada) !== 10) throw new Error("Desgaste no registrado correctamente");

  // Verificar costo estimado en OT
  const otAfterProd = await prisma.ordenTrabajo.findUnique({ where: { id: ot.id } });
  const costOverheads = Number(otAfterProd?.costOverheads || 0);
  console.log(`   - Costo Overheads en OT: $${costOverheads} (Esperado: $5)`);
  
  if (Math.abs(costOverheads - 5) > 0.01) throw new Error(`Costo estimado incorrecto. Esperado 5, obtenido ${costOverheads}`);

  // 5. Reportar Rotura (Fin de vida prematuro)
  console.log("\n5. Reportando Rotura (Fin de vida prematuro)...");
  // La herramienta se rompió a las 10 piezas.
  // Costo Real Total = $50.
  // Costo ya imputado (estimado) = $5.
  // Ajuste necesario = $50 - $5 = $45.
  // El sistema debería crear un ajuste de $45.
  
  const breakRes = await updateToolStatus(toolId, "ROTA");
  if (!breakRes.ok) throw new Error(`Error reportando rotura: ${breakRes.message}`);
  console.log("   - Herramienta reportada como ROTA");

  // Verificar estado final
  const toolBroken = await prisma.toolInstance.findUnique({ where: { id: toolId } });
  if (toolBroken?.estado !== "ROTA") throw new Error("La herramienta no está en estado ROTA");

  // Verificar ajuste de costos
  const otFinal = await prisma.ordenTrabajo.findUnique({ where: { id: ot.id } });
  const costOverheadsFinal = Number(otFinal?.costOverheads || 0);
  
  console.log(`   - Costo Overheads Final en OT: $${costOverheadsFinal} (Esperado: $50)`);
  
  if (Math.abs(costOverheadsFinal - 50) > 0.01) {
    throw new Error(`Costo real incorrecto. Esperado 50, obtenido ${costOverheadsFinal}`);
  }

  console.log("\n✅ PRUEBA EXITOSA: El flujo de ciclo de vida de herramienta funciona correctamente.");

  // Cleanup
  await prisma.oTToolUsage.deleteMany({ where: { toolInstanceId: toolId } });
  await prisma.toolInstance.delete({ where: { id: toolId } });
  await prisma.ordenTrabajo.delete({ where: { id: ot.id } });
  await prisma.producto.delete({ where: { sku: product.sku } });
  await prisma.maquina.delete({ where: { id: machine.id } });
  await prisma.cliente.delete({ where: { id: cliente.id } });
}

main()
  .catch((e) => {
    console.error("❌ Error en la prueba:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
