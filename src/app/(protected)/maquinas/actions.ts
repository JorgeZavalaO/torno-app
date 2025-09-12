"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteMachines } from "@/app/lib/guards";


type R = { ok: true; message?: string; id?: string } | { ok: false; message: string };
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

function bumpAll(id?: string) {
  try {
    // Revalidate listado y detalle de máquinas y el panel de control
    revalidatePath("/maquinas");
    if (id) revalidatePath(`/maquinas/${id}`);
    revalidatePath("/control");
    // pequeño log para depuración en server
    // console.log(`bumpAll: revalidated /maquinas ${id ? `and /maquinas/${id}` : ''}`);
  } catch (err) {
    console.error("Error revalidating paths in bumpAll:", err);
  }
}

/* ------------------------ CRUD Maquina ------------------------ */
const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  codigo: z.string().min(2),
  nombre: z.string().min(2),
  categoria: z.string().optional(),
  estado: z.enum(["ACTIVA", "MANTENIMIENTO", "BAJA"]).optional(),
  ubicacion: z.string().optional(),
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  capacidad: z.string().optional(),
  notas: z.string().optional(),
});

export async function upsertMachine(fd: FormData): Promise<R> {
  await assertCanWriteMachines();
  const parsed = UpsertSchema.safeParse({
    id: fd.get("id") || undefined,
    codigo: fd.get("codigo"),
    nombre: fd.get("nombre"),
    categoria: fd.get("categoria") || undefined,
    estado: (fd.get("estado") || "ACTIVA") as "ACTIVA" | "MANTENIMIENTO" | "BAJA",
    ubicacion: fd.get("ubicacion") || undefined,
    fabricante: fd.get("fabricante") || undefined,
    modelo: fd.get("modelo") || undefined,
    serie: fd.get("serie") || undefined,
    capacidad: fd.get("capacidad") || undefined,
    notas: fd.get("notas") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const data = parsed.data;
  const m = data.id
    ? await prisma.maquina.update({ where: { id: data.id }, data })
    : await prisma.maquina.create({ data });

  bumpAll(m.id);
  return { ok: true, id: m.id, message: data.id ? "Máquina actualizada" : "Máquina creada" };
}

export async function deleteMachine(id: string): Promise<R> {
  await assertCanWriteMachines();
  try {
    await prisma.maquina.delete({ where: { id } });
    bumpAll();
    return { ok: true, message: "Máquina eliminada" };
  } catch {
    // Si hay FK, aplicamos baja lógica
    await prisma.maquina.update({ where: { id }, data: { estado: "BAJA" } });
    bumpAll(id);
    return { ok: true, message: "Máquina dada de baja" };
  }
}

/* ------------------------ Mantenimiento ------------------------ */
const PlanSchema = z.object({
  maquinaId: z.string().uuid(),
  tipo: z.string().min(2),
  fechaProg: z.coerce.date(),
  nota: z.string().max(300).optional(),
  costo: z.coerce.number().nonnegative().optional(),
});

export async function scheduleMaintenance(fd: FormData): Promise<R> {
  await assertCanWriteMachines();
  const parsed = PlanSchema.safeParse({
    maquinaId: fd.get("maquinaId"),
    tipo: fd.get("tipo"),
    fechaProg: fd.get("fechaProg"),
    nota: fd.get("nota") || undefined,
    costo: (fd.get("costo") ?? fd.get("costoEstimado")) || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  await prisma.maquinaMantenimiento.create({
    data: {
      maquinaId: parsed.data.maquinaId,
      tipo: parsed.data.tipo,
      estado: "PENDIENTE",
      fechaProg: parsed.data.fechaProg,
      nota: parsed.data.nota ?? null,
      costo: D(parsed.data.costo ?? 0),
    },
  });
  bumpAll(parsed.data.maquinaId);
  return { ok: true, message: "Mantenimiento programado" };
}

const UpdateMaintenanceSchema = z.object({
  id: z.string().uuid(),
  tipo: z.string().min(2).optional(),
  fechaProg: z.coerce.date().optional(),
  costo: z.coerce.number().nonnegative().optional(),
  nota: z.string().max(300).optional(),
});

export async function updateMaintenance(fd: FormData): Promise<R> {
  await assertCanWriteMachines();
  const parsed = UpdateMaintenanceSchema.safeParse({
    id: fd.get("id"),
    tipo: fd.get("tipo") || undefined,
    fechaProg: fd.get("fechaProg") || undefined,
    costo: (fd.get("costo") ?? fd.get("costoEstimado")) || undefined,
    nota: fd.get("nota") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  // Obtener mantenimiento para validar estado y maquinaId
  const current = await prisma.maquinaMantenimiento.findUnique({
    where: { id: parsed.data.id },
    select: { estado: true, maquinaId: true },
  });
  if (!current) return { ok: false, message: "Mantenimiento no encontrado" };
  if (current.estado !== "PENDIENTE") {
    return { ok: false, message: "Solo se puede editar un mantenimiento pendiente" };
  }

  const data: Prisma.MaquinaMantenimientoUpdateInput = {};
  if (parsed.data.tipo) data.tipo = parsed.data.tipo;
  if (parsed.data.fechaProg) data.fechaProg = parsed.data.fechaProg;
  if (parsed.data.nota !== undefined) data.nota = parsed.data.nota ?? null;
  if (parsed.data.costo !== undefined) data.costo = D(parsed.data.costo);

  await prisma.maquinaMantenimiento.update({
    where: { id: parsed.data.id },
    data,
  });

  bumpAll(current.maquinaId);
  return { ok: true, message: "Mantenimiento actualizado" };
}

const CloseSchema = z.object({
  id: z.string().uuid(), // id de MaquinaMantenimiento
  fechaReal: z.coerce.date().optional(),
  costo: z.coerce.number().nonnegative().optional(),
  nota: z.string().max(300).optional(),
});

export async function closeMaintenance(fd: FormData): Promise<R> {
  await assertCanWriteMachines();
  const parsed = CloseSchema.safeParse({
    id: fd.get("id"),
    fechaReal: fd.get("fechaReal") || new Date(),
    costo: (fd.get("costo") as FormDataEntryValue | null) || undefined,
    nota: fd.get("nota") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  // Construimos data de actualización sin sobrescribir costo si no se envía
  const updateData: Prisma.MaquinaMantenimientoUpdateInput = {
    estado: "COMPLETADO",
    fechaReal: parsed.data.fechaReal ?? new Date(),
    nota: parsed.data.nota ?? undefined,
  };
  if (parsed.data.costo !== undefined) {
    updateData.costo = D(parsed.data.costo);
  }

  const mm = await prisma.maquinaMantenimiento.update({
    where: { id: parsed.data.id },
    data: updateData,
    select: { maquinaId: true },
  });
  // Log for debugging: confirmar que se actualizó y qué maquina se revalidará
  try {
    console.info("closeMaintenance: updated maintenance", { maintenanceId: parsed.data.id, maquinaId: mm.maquinaId });
  } catch {
    // ignore logging errors
  }

  bumpAll(mm.maquinaId);
  return { ok: true, message: "Mantenimiento cerrado" };
}

/* ------------------------ Eventos de Máquina ------------------------ */
const EventSchema = z.object({
  maquinaId: z.string().uuid(),
  tipo: z.enum(["USO", "PARO", "MANTENIMIENTO", "AVERIA", "DISPONIBLE"]),
  inicio: z.coerce.date(),
  fin: z.coerce.date().optional(),
  horas: z.coerce.number().positive(),
  nota: z.string().max(500).optional(),
  otId: z.string().uuid().optional(),
});

export async function logMachineEvent(fd: FormData): Promise<R> {
  await assertCanWriteMachines();
  const parsed = EventSchema.safeParse({
    maquinaId: fd.get("maquinaId"),
    tipo: fd.get("tipo"),
    inicio: fd.get("inicio"),
    fin: fd.get("fin") || undefined,
    horas: fd.get("horas"),
    nota: fd.get("nota") || undefined,
    otId: fd.get("otId") || undefined,
  });
  
  if (!parsed.success) {
    console.error("Validation error:", parsed.error);
    return { ok: false, message: "Datos inválidos" };
  }

  try {
    // Obtener el usuario actual para asociar al evento
    const { getCurrentUser } = await import("@/app/lib/auth");
    const user = await getCurrentUser();

    await prisma.maquinaEvento.create({
      data: {
        maquinaId: parsed.data.maquinaId,
        tipo: parsed.data.tipo,
        inicio: parsed.data.inicio,
        fin: parsed.data.fin ?? null,
        horas: D(parsed.data.horas),
        nota: parsed.data.nota ?? null,
        otId: parsed.data.otId ?? null,
        userId: user?.id ?? null,
      },
    });

    bumpAll(parsed.data.maquinaId);
    
    const tipoDescripcion = {
      USO: "uso",
      PARO: "paro por falla",
      MANTENIMIENTO: "mantenimiento",
      AVERIA: "avería",
      DISPONIBLE: "disponibilidad"
    }[parsed.data.tipo];

    return { 
      ok: true, 
      message: `Evento de ${tipoDescripcion} registrado correctamente`
    };
  } catch (error) {
    console.error("Error logging machine event:", error);
    return { ok: false, message: "Error al registrar el evento" };
  }
}

