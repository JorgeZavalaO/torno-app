"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanWriteProduction } from "@/app/lib/guards";
import { logHoursBulk, logPieces } from "@/app/server/services/production";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { recomputeOTCosts } from "@/app/(protected)/ot/actions"; // IMPORTA
import { registerMachineProduction } from "@/app/(protected)/inventario/tools-actions";

/* -------------------------------------------------------------------------- */
/*                                Infra común                                 */
/* -------------------------------------------------------------------------- */

type R = { ok: true; message?: string } | { ok: false; message: string };

function bumpControl(otIds: string[] = []) {
  revalidateTag(cacheTags.workorders);
  revalidateTag(cacheTags.worklogs("")); // overview agregada
  for (const id of otIds) {
    revalidateTag(cacheTags.workorder(id));
    revalidateTag(cacheTags.worklogs(id));
  }
  revalidatePath("/control", "page");
  // Invalida el cache de detalle de OT para que se recalcule costLabor y otros costos
  revalidateTag("ot:detail");
  revalidatePath("/ot", "page");
}

/* -------------------------------------------------------------------------- */
/*                       Utilidad: refrescar tablero manual                    */
/* -------------------------------------------------------------------------- */

export async function revalidateControl(): Promise<R> {
  bumpControl();
  return { ok: true, message: "Tablero actualizado" };
}

/* -------------------------------------------------------------------------- */
/*                   Registro integrado (horas + piezas juntos)                */
/* -------------------------------------------------------------------------- */

// Versión simplificada para debug
const SimpleSchema = z.object({
  otId: z.string().min(1),
  horas: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional(),
  maquina: z.union([z.string(), z.null(), z.undefined()]).optional(),
  maquinas: z.union([z.string(), z.array(z.any()), z.null(), z.undefined()]).optional(),
  nota: z.union([z.string(), z.null(), z.undefined()]).optional(),
  userId: z.union([z.string(), z.null(), z.undefined()]).optional(),
  items: z.union([z.string(), z.array(z.any()), z.null(), z.undefined()]).optional(),
});

export async function logWorkAndPieces(fd: FormData): Promise<R> {
  await assertCanWriteProduction();

  // Debug: log what we're receiving
  const rawData = {
    otId: fd.get("otId"),
    horas: fd.get("horas"),
    maquina: fd.get("maquina"),
    maquinas: fd.get("maquinas"),
    maquinaId: fd.get("maquinaId"),
    nota: fd.get("nota"),
    userId: fd.get("userId"),
    items: fd.get("items"),
  };

  // Validación básica primero
  const basicParsed = SimpleSchema.safeParse(rawData);
  if (!basicParsed.success) {
    console.error("Basic validation failed:", basicParsed.error.flatten());
    return { ok: false, message: "Error de datos básicos" };
  }

  // Procesamiento manual y más robusto
  const data = basicParsed.data;
  
  // Procesar OT ID
  const otId = data.otId;
  if (!otId) {
    return { ok: false, message: "ID de OT es requerido" };
  }

  // Procesar horas
  let horas: number | undefined;
  if (data.horas !== null && data.horas !== undefined && data.horas !== "") {
    const horasStr = String(data.horas).replace(",", ".");
    const horasNum = parseFloat(horasStr);
    if (Number.isFinite(horasNum) && horasNum > 0) {
      horas = horasNum;
    }
  }

  // Procesar múltiples máquinas
  let maquinas: Array<{ id?: string; nombre?: string; horas: number; userId?: string }> | undefined;
  if (data.maquinas) {
    try {
      if (typeof data.maquinas === "string") {
        const parsed = JSON.parse(data.maquinas);
        if (Array.isArray(parsed)) {
          maquinas = parsed.filter(m => 
            m && typeof m === "object" && 
            typeof m.horas === "number" && 
            Number.isFinite(m.horas) && 
            m.horas > 0
          ).map(m => ({
            id: m.id && typeof m.id === "string" && m.id.trim() ? String(m.id).trim() : undefined,
            nombre: m.nombre ? String(m.nombre).trim() : undefined,
            horas: Number(m.horas),
            userId: m.userId && typeof m.userId === "string" && m.userId.trim() ? String(m.userId).trim() : undefined,
          }));
        }
      } else if (Array.isArray(data.maquinas)) {
        maquinas = data.maquinas.filter(m => 
          m && typeof m === "object" && 
          typeof m.horas === "number" && 
          Number.isFinite(m.horas) && 
          m.horas > 0
        ).map(m => ({
          id: (m as { id?: unknown })?.id && typeof (m as { id?: unknown }).id === "string" && ((m as { id?: string }).id as string).trim() ? String((m as { id?: string }).id).trim() : undefined,
          nombre: (m as { nombre?: unknown }).nombre ? String((m as { nombre?: unknown }).nombre as string).trim() : undefined,
          horas: Number((m as { horas: number }).horas),
          userId: (m as { userId?: unknown }).userId && typeof (m as { userId?: unknown }).userId === "string" && ((m as { userId?: string }).userId as string).trim() ? String((m as { userId?: string }).userId).trim() : undefined,
        }));
      }
    } catch {
      // Error parsing maquinas - continue without maquinas
    }
  }

  // Procesar máquina simple (solo si no hay múltiples máquinas)
  let maquina: string | undefined;
  let maquinaId: string | undefined;
  if (!maquinas || maquinas.length === 0) {
    if (data.maquina && typeof data.maquina === "string" && data.maquina.trim()) {
      maquina = data.maquina.trim();
    }
    const mid = fd.get("maquinaId");
    if (typeof mid === "string" && mid) {
      maquinaId = mid;
    }
  }

  // Procesar nota
  let nota: string | undefined;
  if (data.nota && typeof data.nota === "string" && data.nota.trim()) {
    nota = data.nota.trim();
  }

  // Procesar usuarios
  let userId: string | undefined;
  if (data.userId && typeof data.userId === "string" && data.userId.trim()) {
    userId = data.userId.trim();
  }
  
  // Procesar segundo usuario
  let userId2: string | undefined;
  const uid2 = fd.get("userId2");
  if (uid2 && typeof uid2 === "string" && uid2.trim()) {
    userId2 = uid2.trim();
  }

  // Procesar items/piezas
  let items: Array<{ piezaId: string; cantidad: number }> = [];
  if (data.items) {
    try {
      if (typeof data.items === "string") {
        const parsed = JSON.parse(data.items);
        if (Array.isArray(parsed)) {
          items = parsed.filter(item => 
            item && 
            typeof item === "object" && 
            typeof item.piezaId === "string" && 
            item.piezaId.trim() &&
            typeof item.cantidad === "number" && 
            Number.isFinite(item.cantidad) && 
            item.cantidad > 0
          ).map(item => ({
            piezaId: String(item.piezaId).trim(),
            cantidad: Number(item.cantidad)
          }));
        }
      } else if (Array.isArray(data.items)) {
        items = data.items.filter(item => 
          item && 
          typeof item === "object" && 
          typeof item.piezaId === "string" && 
          item.piezaId.trim() &&
          typeof item.cantidad === "number" && 
          Number.isFinite(item.cantidad) && 
          item.cantidad > 0
        ).map(item => ({
          piezaId: String(item.piezaId).trim(),
          cantidad: Number(item.cantidad)
        }));
      }
    } catch {
      // Error parsing items - continue without items
    }
  }

  // Verificar que hay algo que registrar
  const hasHours = (horas && horas > 0) || (maquinas && maquinas.length > 0);
  const hasPieces = items.length > 0;
  
  if (!hasHours && !hasPieces) {
    return { ok: false, message: "Debes registrar horas, piezas o ambos" };
  }

  // Si se registran piezas, la OT debe estar en proceso
  if (items.length) {
    const ot = await prisma.ordenTrabajo.findUnique({
      where: { id: otId },
      select: { estado: true },
    });
    if (!ot) return { ok: false, message: "OT no existe" };
    if (ot.estado !== "IN_PROGRESS") {
      return { ok: false, message: "Solo se pueden registrar piezas en OTs EN PROCESO" };
    }
  }

  // Construir entradas de horas (soporta múltiples máquinas)
  const hourEntries: {
    otId: string; horas: number; maquina?: string; nota?: string; userId?: string;
  }[] = [];

  if (Array.isArray(maquinas) && maquinas.length) {
    for (const m of maquinas) {
      if (Number.isFinite(m.horas) && m.horas > 0) {
        // Usar el userId específico de la máquina si existe, sino el userId general
        const mWithUser = m as { id?: string; nombre?: string; horas: number; userId?: string };
        const machineUserId = mWithUser.userId || userId;
        hourEntries.push({
          otId,
          horas: m.horas,
          maquina: m.nombre || undefined,
          nota,
          userId: machineUserId,
        });
      }
    }
  } else if (horas && horas > 0) {
    hourEntries.push({ otId, horas, maquina, nota, userId });
  }

  // Si no hay horas válidas ni piezas, no hay qué hacer
  if (hourEntries.length === 0 && items.length === 0) {
    return { ok: false, message: "Debes registrar horas, piezas o ambos" };
  }

  // Ejecutar
  if (hourEntries.length) {
    const rH = await logHoursBulk(hourEntries);
    if (!rH.ok) return { ok: false, message: rH.message || "Error al registrar horas" };

    // Registrar eventos de máquina (USO) para reflejar en módulo de máquinas
    try {
      const eventos: Array<{ maquinaId: string; horas: number; nota?: string; userId?: string }> = [];
      type Mx = { nombre?: string; horas: number; id?: string; userId?: string };
      if (Array.isArray(maquinas) && maquinas.length) {
        for (const m of maquinas as Mx[]) {
          // Priorizar id explícito si viene en el payload; si no, intentar buscar por nombre
          let mId: string | undefined = m.id;
          if (!mId && m.nombre) {
            const mm = await prisma.maquina.findFirst({ where: { nombre: m.nombre }, select: { id: true } });
            if (mm) mId = mm.id;
          }
          if (mId) eventos.push({ maquinaId: mId, horas: m.horas, nota, userId: m.userId || userId || userId2 || undefined });
        }
      } else if (horas && (maquinaId || maquina)) {
        let mId = maquinaId;
        if (!mId && maquina) {
          const mm = await prisma.maquina.findFirst({ where: { nombre: maquina }, select: { id: true } });
          if (mm) mId = mm.id;
        }
        if (mId) eventos.push({ maquinaId: mId, horas, nota, userId: userId || userId2 || undefined });
      }

      if (eventos.length) {
        const client = prisma as unknown as { maquinaEvento: { createMany: (args: { data: Array<{ maquinaId: string; tipo: string; horas: Prisma.Decimal; otId: string; nota: string|null; userId: string|null }> }) => Promise<unknown> } };
        await client.maquinaEvento.createMany({
          data: eventos.map(e => ({
            maquinaId: e.maquinaId,
            tipo: "USO",
            horas: new Prisma.Decimal(e.horas),
            otId,
            nota: e.nota ?? null,
            userId: e.userId ?? null,
          })),
        });
        // Invalida también vistas de máquinas (listado y detalles específicos)
        revalidatePath("/maquinas", "page");
        try {
          const uniqueMs = Array.from(new Set(eventos.map(e => e.maquinaId)));
          for (const mid of uniqueMs) {
            revalidatePath(`/maquinas/${mid}`, "page");
          }
        } catch {}
      }
    } catch {
      // No se pudo crear MaquinaEvento - continue
    }
  }
  if (items.length) {
    const rP = await logPieces({ otId, items });
    if (!rP.ok) return { ok: false, message: rP.message || "Error al registrar piezas" };

    // --- NUEVO: Registrar desgaste de herramientas si hay máquina asociada ---
    // Intentamos obtener el ID de la máquina usada para este lote de piezas.
    // Prioridad:
    // 1. maquinaId explícito en el formulario (si se seleccionó máquina simple)
    // 2. maquina (nombre) explícito en el formulario
    // 3. Si se enviaron horas con máquinas múltiples, usar la primera máquina (heurística simple)
    
    let targetMachineId: string | undefined = maquinaId;

    if (!targetMachineId && maquina) {
      const m = await prisma.maquina.findFirst({ where: { nombre: maquina }, select: { id: true } });
      if (m) targetMachineId = m.id;
    }

    if (!targetMachineId && maquinas && maquinas.length > 0) {
      // Si hay múltiples máquinas, es ambiguo a cuál asignar el desgaste de las piezas.
      // Asumimos la primera máquina de la lista o intentamos resolver por nombre/id.
      const firstM = maquinas[0];
      if (firstM.id) targetMachineId = firstM.id;
      else if (firstM.nombre) {
        const m = await prisma.maquina.findFirst({ where: { nombre: firstM.nombre }, select: { id: true } });
        if (m) targetMachineId = m.id;
      }
    }

    if (targetMachineId) {
      const totalPiezas = items.reduce((acc, item) => acc + item.cantidad, 0);
      // Registrar desgaste en segundo plano
      await registerMachineProduction(otId, targetMachineId, totalPiezas);
    }
    // -----------------------------------------------------------------------
  }

  await recomputeOTCosts(otId); // NUEVO: recalcular costos después de registrar horas/piezas
  bumpControl([otId]);
  return { ok: true, message: "Registro guardado" };
}