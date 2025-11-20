
import { z } from "zod";
import { prisma } from "../src/app/lib/prisma";
import { Prisma, ToolState } from "@prisma/client";

// Mock revalidate
const revalidatePath = (path: string) => console.log(`[Mock] revalidatePath: ${path}`);
const revalidateTag = (tag: string) => console.log(`[Mock] revalidateTag: ${tag}`);
const cacheTags = { inventoryProducts: "inventory-products" };

const D = (n: number | string | Prisma.Decimal) => new Prisma.Decimal(n ?? 0);

/* -------------------------------------------------------------------------- */
/*                                COPIED LOGIC                                */
/* -------------------------------------------------------------------------- */

const CreateToolInstanceSchema = z.object({
  productoId: z.string().min(1),
  codigo: z.string().min(1),
  ubicacion: z.string().optional(),
  costoInicial: z.coerce.number().min(0),
  vidaUtilEstimada: z.coerce.number().positive().optional(),
});

async function createToolInstance(fd: FormData) {
  // await assertCanWriteInventory(); // REMOVED

  const parsed = CreateToolInstanceSchema.safeParse({
    productoId: fd.get("productoId"),
    codigo: fd.get("codigo"),
    ubicacion: fd.get("ubicacion") || undefined,
    costoInicial: fd.get("costoInicial"),
    vidaUtilEstimada: fd.get("vidaUtilEstimada") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const { productoId, codigo, ubicacion, costoInicial, vidaUtilEstimada } = parsed.data;

  try {
    const producto = await prisma.producto.findUnique({
      where: { sku: productoId },
      select: { vidaUtilEstimada: true, nombre: true }
    });

    if (!producto) return { ok: false, message: "Producto no encontrado" };

    const vidaUtil = vidaUtilEstimada ? D(vidaUtilEstimada) : producto.vidaUtilEstimada;

    const tool = await prisma.toolInstance.create({
      data: {
        productoId,
        codigo,
        ubicacion,
        costoInicial: D(costoInicial),
        vidaUtilEstimada: vidaUtil,
        estado: "NUEVA",
      }
    });

    revalidateTag(cacheTags.inventoryProducts);
    revalidatePath(`/inventario/${productoId}`);
    return { ok: true, message: "Herramienta registrada exitosamente", tool };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { ok: false, message: "El código de herramienta ya existe" };
    }
    console.error(e);
    return { ok: false, message: "Error al registrar herramienta" };
  }
}

async function updateToolStatus(instanceId: string, newState: ToolState) {
  // await assertCanWriteInventory(); // REMOVED

  if (newState === "ROTA" || newState === "DESGASTADA" || newState === "PERDIDA") {
    return finalizeToolLifeAndRecalculate(instanceId, newState);
  }

  try {
    await prisma.toolInstance.update({
      where: { id: instanceId },
      data: {
        estado: newState,
        fechaBaja: null,
      }
    });
    
    revalidatePath("/inventario"); 
    return { ok: true, message: `Estado actualizado a ${newState}` };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Error al actualizar estado" };
  }
}

async function finalizeToolLifeAndRecalculate(instanceId: string, finalState: ToolState) {
  // await assertCanWriteInventory(); // REMOVED
  
  if (finalState !== "ROTA" && finalState !== "DESGASTADA" && finalState !== "PERDIDA") {
    return { ok: false, message: "Solo se pueden recalcular costos al dar de baja la herramienta" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const tool = await tx.toolInstance.findUniqueOrThrow({
        where: { id: instanceId },
        include: { usos: true }
      });

      if (tool.vidaAcumulada.toNumber() <= 0) {
        await tx.toolInstance.update({
          where: { id: instanceId },
          data: { estado: finalState, fechaBaja: new Date() }
        });
        return;
      }

      const costoRealUnitario = tool.costoInicial.div(tool.vidaAcumulada);

      for (const uso of tool.usos) {
        const costoRealUso = uso.cantidadProducida.mul(costoRealUnitario);
        
        let costoEstimadoOriginal = new Prisma.Decimal(0);
        if (tool.vidaUtilEstimada && tool.vidaUtilEstimada.toNumber() > 0) {
          costoEstimadoOriginal = uso.cantidadProducida
            .div(tool.vidaUtilEstimada)
            .mul(tool.costoInicial);
        }

        const ajuste = costoRealUso.minus(costoEstimadoOriginal);

        if (ajuste.abs().toNumber() > 0.01) {
          await tx.ordenTrabajo.update({
            where: { id: uso.otId },
            data: {
              costOverheads: { increment: ajuste },
              costTotal: { increment: ajuste }
            }
          });
        }
      }

      await tx.toolInstance.update({
        where: { id: instanceId },
        data: { 
          estado: finalState, 
          fechaBaja: new Date() 
        }
      });
    });

    revalidatePath("/inventario");
    return { ok: true, message: "Herramienta dada de baja y costos recalculados correctamente" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Error al recalcular costos" };
  }
}

async function mountToolOnMachine(toolId: string, maquinaId: string) {
  // await assertCanWriteInventory(); // REMOVED

  try {
    const tool = await prisma.toolInstance.findUnique({ where: { id: toolId } });
    if (!tool) return { ok: false, message: "Herramienta no encontrada" };
    
    if (tool.estado === "ROTA" || tool.estado === "DESGASTADA" || tool.estado === "PERDIDA") {
      return { ok: false, message: "No se puede montar una herramienta dada de baja" };
    }

    await prisma.toolInstance.update({
      where: { id: toolId },
      data: {
        maquinaId,
        estado: "EN_USO",
        ubicacion: "Montada en máquina"
      }
    });

    revalidatePath("/inventario");
    revalidatePath("/maquinas");
    return { ok: true, message: "Herramienta montada correctamente" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Error al montar herramienta" };
  }
}

async function registerMachineProduction(otId: string, maquinaId: string, cantidadProducida: number) {
  if (cantidadProducida <= 0) return { ok: true, message: "Cantidad cero, no hay desgaste" };

  try {
    const tools = await prisma.toolInstance.findMany({
      where: { 
        maquinaId,
        estado: "EN_USO"
      },
      include: { producto: true }
    });

    if (tools.length === 0) {
      return { ok: true, message: "No había herramientas montadas para registrar desgaste" };
    }

    let totalCostAdded = new Prisma.Decimal(0);

    await prisma.$transaction(async (tx) => {
      for (const tool of tools) {
        await tx.oTToolUsage.create({
          data: {
            otId,
            toolInstanceId: tool.id,
            cantidadProducida: D(cantidadProducida),
            estadoInicial: tool.estado,
            estadoFinal: "EN_USO",
            fechaFin: new Date(),
            notas: "Desgaste automático por producción en máquina"
          }
        });

        const nuevaVida = tool.vidaAcumulada.plus(cantidadProducida);
        await tx.toolInstance.update({
          where: { id: tool.id },
          data: { vidaAcumulada: nuevaVida }
        });

        if (tool.vidaUtilEstimada && tool.vidaUtilEstimada.toNumber() > 0) {
          const costoEstimado = D(cantidadProducida)
            .div(tool.vidaUtilEstimada)
            .mul(tool.costoInicial);
          
          totalCostAdded = totalCostAdded.plus(costoEstimado);
        }
      }

      if (totalCostAdded.toNumber() > 0) {
        await tx.ordenTrabajo.update({
          where: { id: otId },
          data: {
            costOverheads: { increment: totalCostAdded },
            costTotal: { increment: totalCostAdded }
          }
        });
      }
    });

    return { ok: true, message: `Desgaste registrado en ${tools.length} herramientas` };
  } catch (e) {
    console.error("Error en registerMachineProduction:", e);
    return { ok: false, message: "Error al registrar desgaste de herramientas" };
  }
}

/* -------------------------------------------------------------------------- */
/*                                TEST SCRIPT                                 */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log("🚀 Iniciando prueba de flujo completo de Herramientas (LOGIC ONLY)...");

  // 1. Setup
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
    }
  });
  console.log(`   - Máquina creada: ${machine.codigo}`);

  const product = await prisma.producto.create({
    data: {
      nombre: "Broca Test",
      sku: `BROCA-${Date.now()}`,
      categoria: "HERRAMIENTA_CORTE",
      uom: "UNIDAD",
      costo: 50,
      requiereTrazabilidad: true,
      vidaUtilEstimada: 100
    }
  });
  console.log(`   - Producto creado: ${product.sku} (Costo: $50, Vida: 100)`);

  const ot = await prisma.ordenTrabajo.create({
    data: {
      codigo: `OT-TEST-${Date.now()}`,
      clienteId: cliente.id,
      estado: "IN_PROGRESS",
      costOverheads: 0,
      costTotal: 0
    }
  });
  console.log(`   - OT creada: ${ot.codigo}`);

  // 2. Crear Instancia
  console.log("\n2. Creando Instancia de Herramienta...");
  
  const fd = new FormData();
  fd.append("productoId", product.sku);
  fd.append("codigo", `T-${Date.now()}`);
  fd.append("costoInicial", "50");
  fd.append("ubicacion", "Almacén");

  const toolRes = await createToolInstance(fd);
  
  // 
  if (!toolRes.ok || !toolRes.tool) throw new Error(`Error creando herramienta: ${toolRes.message}`);
  // 
  const toolId = toolRes.tool.id;
  // 
  console.log(`   - Herramienta creada: ${toolRes.tool.codigo}`);

  // 3. Montar
  console.log("\n3. Montando Herramienta en Máquina...");
  const mountRes = await mountToolOnMachine(toolId, machine.id);
  if (!mountRes.ok) throw new Error(`Error montando herramienta: ${mountRes.message}`);
  console.log("   - Herramienta montada correctamente");

  // 4. Simular Producción
  console.log("\n4. Simulando Producción (10 piezas)...");
  await registerMachineProduction(ot.id, machine.id, 10);
  console.log("   - Producción registrada");

  // Verificar desgaste
  const toolAfterProd = await prisma.toolInstance.findUnique({ where: { id: toolId } });
  console.log(`   - Vida Acumulada: ${toolAfterProd?.vidaAcumulada} (Esperado: 10)`);
  if (Number(toolAfterProd?.vidaAcumulada) !== 10) throw new Error("Desgaste no registrado correctamente");

  // Verificar costo estimado
  const otAfterProd = await prisma.ordenTrabajo.findUnique({ where: { id: ot.id } });
  const costOverheads = Number(otAfterProd?.costOverheads || 0);
  console.log(`   - Costo Overheads en OT: $${costOverheads} (Esperado: $5)`);
  
  if (Math.abs(costOverheads - 5) > 0.01) throw new Error(`Costo estimado incorrecto. Esperado 5, obtenido ${costOverheads}`);

  // 5. Reportar Rotura
  console.log("\n5. Reportando Rotura (Fin de vida prematuro)...");
  const breakRes = await updateToolStatus(toolId, "ROTA");
  if (!breakRes.ok) throw new Error(`Error reportando rotura: ${breakRes.message}`);
  console.log("   - Herramienta reportada como ROTA");

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
