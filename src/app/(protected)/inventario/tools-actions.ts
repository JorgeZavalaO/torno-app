"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanWriteInventory, assertCanWriteWorkorders } from "@/app/lib/guards";
import { Prisma, ToolState } from "@prisma/client";

const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

/* -------------------------------------------------------------------------- */
/*                                TOOL INSTANCES                              */
/* -------------------------------------------------------------------------- */

const CreateToolInstanceSchema = z.object({
  productoId: z.string().min(1),
  codigo: z.string().min(1), // Identificador único (QR, serie)
  ubicacion: z.string().optional(),
  costoInicial: z.coerce.number().min(0),
  vidaUtilEstimada: z.coerce.number().positive().optional(),
});

export async function createToolInstance(fd: FormData) {
  await assertCanWriteInventory();

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
    // Verificar si el producto existe y obtener su vida útil por defecto si no se provee
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

    revalidateTag(cacheTags.inventoryProducts); // O un tag específico para herramientas
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

export async function updateToolStatus(instanceId: string, newState: ToolState) {
  await assertCanWriteInventory();

  // Si el nuevo estado es terminal, usar la función de recálculo
  if (newState === "ROTA" || newState === "DESGASTADA" || newState === "PERDIDA") {
    return finalizeToolLifeAndRecalculate(instanceId, newState);
  }

  try {
    await prisma.toolInstance.update({
      where: { id: instanceId },
      data: {
        estado: newState,
        fechaBaja: null, // Si se reactiva (ej. de ROTA a AFILADO por error), limpiar fecha baja
      }
    });
    
    // Si se da de baja, podríamos disparar el recálculo de costos aquí (TODO)
    
    revalidatePath("/inventario"); 
    return { ok: true, message: `Estado actualizado a ${newState}` };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Error al actualizar estado" };
  }
}

/* -------------------------------------------------------------------------- */
/*                                OT TOOL USAGE                               */
/* -------------------------------------------------------------------------- */

const RegisterUsageSchema = z.object({
  otId: z.string().uuid(),
  toolInstanceId: z.string().uuid(),
  cantidadProducida: z.coerce.number().min(0),
  estadoFinal: z.enum(["NUEVA", "EN_USO", "AFILADO", "DESGASTADA", "ROTA", "PERDIDA"]),
  notas: z.string().optional(),
});

export async function registerToolUsage(fd: FormData) {
  await assertCanWriteWorkorders();

  const parsed = RegisterUsageSchema.safeParse({
    otId: fd.get("otId"),
    toolInstanceId: fd.get("toolInstanceId"),
    cantidadProducida: fd.get("cantidadProducida"),
    estadoFinal: fd.get("estadoFinal"),
    notas: fd.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const { otId, toolInstanceId, cantidadProducida, estadoFinal, notas } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Registrar uso
      // Buscar estado actual de la herramienta para ponerlo como estadoInicial
      const tool = await tx.toolInstance.findUniqueOrThrow({ where: { id: toolInstanceId } });
      
      await tx.oTToolUsage.create({
        data: {
          otId,
          toolInstanceId,
          cantidadProducida: D(cantidadProducida),
          estadoInicial: tool.estado,
          estadoFinal: estadoFinal as ToolState,
          notas,
          fechaFin: new Date(),
        }
      });

      // 2. Actualizar acumulado de vida y estado de la herramienta
      const nuevaVidaAcumulada = new Prisma.Decimal(tool.vidaAcumulada).plus(cantidadProducida);
      
      await tx.toolInstance.update({
        where: { id: toolInstanceId },
        data: {
          vidaAcumulada: nuevaVidaAcumulada,
          estado: estadoFinal as ToolState,
          fechaBaja: (estadoFinal === "ROTA" || estadoFinal === "DESGASTADA" || estadoFinal === "PERDIDA") ? new Date() : null,
        }
      });

      // 3. Costeo preliminar (Estimado)
      // Costo = (CantProducida / VidaEstimada) * CostoInicial
      // Si vidaEstimada es null o 0, usar un fallback o no costear aún
      if (tool.vidaUtilEstimada && tool.vidaUtilEstimada.toNumber() > 0) {
        const costoEstimado = D(cantidadProducida)
          .div(tool.vidaUtilEstimada)
          .mul(tool.costoInicial);
        
        // Sumar al costo de la OT (campo costOverheads o crear uno nuevo costTools)
        // Por ahora sumamos a costOverheads como se hacía con toolingPerPc
        await tx.ordenTrabajo.update({
          where: { id: otId },
          data: {
            costOverheads: { increment: costoEstimado },
            costTotal: { increment: costoEstimado }
          }
        });
      }
    });

    revalidatePath(`/ot/${otId}`);
    return { ok: true, message: "Uso de herramienta registrado" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Error al registrar uso de herramienta" };
  }
}

/* -------------------------------------------------------------------------- */
/*                            COST RECALCULATION                              */
/* -------------------------------------------------------------------------- */

/**
 * Recalcula los costos reales de todas las OTs que usaron una herramienta específica
 * cuando esta llega al final de su vida útil (ROTA, DESGASTADA, PERDIDA).
 * 
 * Lógica:
 * 1. Costo Real Unitario = Costo Inicial Herramienta / Vida Total Acumulada
 * 2. Para cada uso en OT:
 *    - Costo Real Asignado = Cantidad Producida * Costo Real Unitario
 *    - Ajuste = Costo Real Asignado - Costo Estimado Originalmente
 * 3. Actualizar OT sumando el ajuste (sin reabrirla, solo actualizando costos)
 */
export async function finalizeToolLifeAndRecalculate(instanceId: string, finalState: ToolState) {
  await assertCanWriteInventory();
  
  if (finalState !== "ROTA" && finalState !== "DESGASTADA" && finalState !== "PERDIDA") {
    return { ok: false, message: "Solo se pueden recalcular costos al dar de baja la herramienta" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Obtener datos finales de la herramienta
      const tool = await tx.toolInstance.findUniqueOrThrow({
        where: { id: instanceId },
        include: { usos: true }
      });

      if (tool.vidaAcumulada.toNumber() <= 0) {
        // Si no se usó nunca, no hay nada que recalcular
        await tx.toolInstance.update({
          where: { id: instanceId },
          data: { estado: finalState, fechaBaja: new Date() }
        });
        return;
      }

      // 2. Calcular Costo Real por unidad de vida (ej. por pieza)
      // Costo Real Unitario = Costo Total / Total Producido
      const costoRealUnitario = tool.costoInicial.div(tool.vidaAcumulada);

      // 3. Iterar sobre todos los usos para ajustar costos
      for (const uso of tool.usos) {
        // Calcular cuánto debió costar realmente este uso
        const costoRealUso = uso.cantidadProducida.mul(costoRealUnitario);
        
        // Calcular cuánto se cargó originalmente (estimado)
        // Reconstruimos el estimado original usando la vida útil estimada que tenía la herramienta
        // Nota: Si la vida estimada cambió en el tiempo, esto podría tener desviación, 
        // pero asumimos la vida estimada del snapshot o la actual del producto.
        // Para mayor precisión, deberíamos haber guardado el "costoAsignado" en OTToolUsage.
        // Como no lo tenemos, usamos la lógica inversa:
        // Estimado = (Cant / VidaEstimada) * CostoInicial
        
        let costoEstimadoOriginal = new Prisma.Decimal(0);
        if (tool.vidaUtilEstimada && tool.vidaUtilEstimada.toNumber() > 0) {
          costoEstimadoOriginal = uso.cantidadProducida
            .div(tool.vidaUtilEstimada)
            .mul(tool.costoInicial);
        }

        const ajuste = costoRealUso.minus(costoEstimadoOriginal);

        // Solo actualizar si el ajuste es significativo (> 0.01)
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

      // 4. Marcar herramienta como dada de baja
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

/* -------------------------------------------------------------------------- */
/*                          MACHINE TOOL MOUNTING                             */
/* -------------------------------------------------------------------------- */

export async function mountToolOnMachine(toolId: string, maquinaId: string) {
  await assertCanWriteInventory();

  try {
    // Verificar que la herramienta esté disponible (NUEVA, AFILADO o EN_USO en otra máquina?)
    // Asumimos que si está en otra máquina, se mueve a esta.
    
    const tool = await prisma.toolInstance.findUnique({ where: { id: toolId } });
    if (!tool) return { ok: false, message: "Herramienta no encontrada" };
    
    if (tool.estado === "ROTA" || tool.estado === "DESGASTADA" || tool.estado === "PERDIDA") {
      return { ok: false, message: "No se puede montar una herramienta dada de baja" };
    }

    await prisma.toolInstance.update({
      where: { id: toolId },
      data: {
        maquinaId,
        estado: "EN_USO", // Al montarla, pasa a estar en uso/disponible en máquina
        ubicacion: "Montada en máquina" // Opcional, redundante con maquinaId
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

export async function unmountToolFromMachine(toolId: string, estadoFinal: ToolState = "AFILADO") {
  await assertCanWriteInventory();

  try {
    await prisma.toolInstance.update({
      where: { id: toolId },
      data: {
        maquinaId: null,
        estado: estadoFinal,
        ubicacion: "Almacén"
      }
    });

    revalidatePath("/inventario");
    revalidatePath("/maquinas");
    return { ok: true, message: "Herramienta desmontada correctamente" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Error al desmontar herramienta" };
  }
}

/**
 * Registra producción en una máquina e imputa el desgaste a TODAS las herramientas montadas.
 * Esta función debe llamarse cuando se registra un Parte de Producción.
 */
export async function registerMachineProduction(otId: string, maquinaId: string, cantidadProducida: number) {
  // Nota: No usamos assertCanWriteInventory aquí porque esto suele llamarse desde el contexto de Producción (OTs)
  // Se asume que quien llama ya validó permisos de OT.
  
  if (cantidadProducida <= 0) return { ok: true, message: "Cantidad cero, no hay desgaste" };

  try {
    // 1. Buscar todas las herramientas montadas en esa máquina
    const tools = await prisma.toolInstance.findMany({
      where: { 
        maquinaId,
        estado: "EN_USO" // Solo las activas
      },
      include: { producto: true }
    });

    if (tools.length === 0) {
      return { ok: true, message: "No había herramientas montadas para registrar desgaste" };
    }

    let totalCostAdded = new Prisma.Decimal(0);

    await prisma.$transaction(async (tx) => {
      for (const tool of tools) {
        // Registrar uso en OTToolUsage
        await tx.oTToolUsage.create({
          data: {
            otId,
            toolInstanceId: tool.id,
            cantidadProducida: D(cantidadProducida),
            estadoInicial: tool.estado,
            estadoFinal: "EN_USO", // Sigue en uso
            fechaFin: new Date(),
            notas: "Desgaste automático por producción en máquina"
          }
        });

        // Actualizar vida acumulada
        const nuevaVida = tool.vidaAcumulada.plus(cantidadProducida);
        await tx.toolInstance.update({
          where: { id: tool.id },
          data: { vidaAcumulada: nuevaVida }
        });

        // Calcular costo estimado
        if (tool.vidaUtilEstimada && tool.vidaUtilEstimada.toNumber() > 0) {
          const costoEstimado = D(cantidadProducida)
            .div(tool.vidaUtilEstimada)
            .mul(tool.costoInicial);
          
          totalCostAdded = totalCostAdded.plus(costoEstimado);
        }
      }

      // Actualizar costos de la OT una sola vez por el total
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
    // No fallamos la transacción principal de producción si esto falla, pero logueamos
    return { ok: false, message: "Error al registrar desgaste de herramientas" };
  }
}
