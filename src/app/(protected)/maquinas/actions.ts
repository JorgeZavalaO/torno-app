"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteWorkorders } from "@/app/lib/guards";


type R = { ok: true; message?: string; id?: string } | { ok: false; message: string };
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

function bumpAll(id?: string) {
  revalidatePath("/maquinas", "page");
  if (id) revalidatePath(`/maquinas/${id}`, "page");
  revalidatePath("/control", "page");
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
  await assertCanWriteWorkorders();
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
  await assertCanWriteWorkorders();
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
});

export async function scheduleMaintenance(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = PlanSchema.safeParse({
    maquinaId: fd.get("maquinaId"),
    tipo: fd.get("tipo"),
    fechaProg: fd.get("fechaProg"),
    nota: fd.get("nota") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  await prisma.maquinaMantenimiento.create({
    data: {
      maquinaId: parsed.data.maquinaId,
      tipo: parsed.data.tipo,
      estado: "PENDIENTE",
      fechaProg: parsed.data.fechaProg,
      nota: parsed.data.nota ?? null,
    },
  });
  bumpAll(parsed.data.maquinaId);
  return { ok: true, message: "Mantenimiento programado" };
}

const CloseSchema = z.object({
  id: z.string().uuid(), // id de MaquinaMantenimiento
  fechaReal: z.coerce.date().optional(),
  costo: z.coerce.number().nonnegative().default(0),
  nota: z.string().max(300).optional(),
});

export async function closeMaintenance(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = CloseSchema.safeParse({
    id: fd.get("id"),
    fechaReal: fd.get("fechaReal") || new Date(),
    costo: fd.get("costo") ?? 0,
    nota: fd.get("nota") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const mm = await prisma.maquinaMantenimiento.update({
    where: { id: parsed.data.id },
    data: {
      estado: "COMPLETADO",
      fechaReal: parsed.data.fechaReal ?? new Date(),
      costo: D(parsed.data.costo || 0),
      nota: parsed.data.nota ?? undefined,
    },
    select: { maquinaId: true },
  });

  bumpAll(mm.maquinaId);
  return { ok: true, message: "Mantenimiento cerrado" };
}

