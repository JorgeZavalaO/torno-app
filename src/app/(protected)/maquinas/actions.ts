"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { assertCanWriteWorkorders } from "@/app/lib/guards";

// Reutilizamos la action de OT para que registre el parte con el nombre de máquina
import { logHours } from "@/app/server/services/production";

type R = { ok: true; message?: string; id?: string } | { ok: false; message: string };
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

function bumpAll(id?: string) {
  revalidatePath("/maquinas", "page");
  if (id) revalidatePath(`/maquinas/${id}`, "page");
  // también refresca el tablero de control
  revalidatePath("/control", "page");
}

/* ------------------------ CRUD Maquina ------------------------ */
const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  codigo: z.string().min(2),
  nombre: z.string().min(2),
  categoria: z.string().optional(),
  estado: z.enum(["ACTIVA","MANTENIMIENTO","BAJA"]).optional(),
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
    estado: (fd.get("estado") || "ACTIVA") as "ACTIVA"|"MANTENIMIENTO"|"BAJA",
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
    // fallback: baja lógica si hay relaciones
    await prisma.maquina.update({ where: { id }, data: { estado: "BAJA" } });
    bumpAll(id);
    return { ok: true, message: "Máquina dada de baja" };
  }
}

/* ------------------------ Eventos ------------------------ */
const EventSchema = z.object({
  maquinaId: z.string().uuid(),
  tipo: z.enum(["USO","PARO","MANTENIMIENTO","AVERIA","DISPONIBLE"]),
  horas: z.coerce.number().nonnegative().default(0), // opcional si hay fin
  inicio: z.coerce.date().optional(),
  fin: z.coerce.date().optional(),
  nota: z.string().max(300).optional(),
  otId: z.string().uuid().optional(),
});

export async function logMachineEvent(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const me = await getCurrentUser();
  const user = me ? await prisma.userProfile.findFirst({ where: { email: me.email }, select: { id: true } }) : null;

  const parsed = EventSchema.safeParse({
    maquinaId: fd.get("maquinaId"),
    tipo: fd.get("tipo"),
    horas: fd.get("horas") ?? 0,
    inicio: fd.get("inicio") || undefined,
    fin: fd.get("fin") || undefined,
    nota: fd.get("nota") || undefined,
    otId: fd.get("otId") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  // Calcular horas si hay inicio/fin y horas=0
  let horasNum = Number(parsed.data.horas || 0);
  if(horasNum === 0 && parsed.data.inicio && parsed.data.fin){
    const ms = parsed.data.fin.getTime() - parsed.data.inicio.getTime();
    if(ms > 0){ horasNum = ms / 3600000; }
  }
  const e = await prisma.maquinaEvento.create({
    data: {
      maquinaId: parsed.data.maquinaId,
      tipo: parsed.data.tipo,
      horas: D(horasNum),
      inicio: parsed.data.inicio ?? undefined,
      fin: parsed.data.fin ?? null,
      nota: parsed.data.nota ?? null,
      otId: parsed.data.otId ?? null,
      userId: user?.id ?? null,
    },
  });

  // si es USO y trae otId/horas => también registrar parte de producción con nombre de máquina
  if (parsed.data.tipo === "USO" && parsed.data.otId && horasNum > 0) {
    const m = await prisma.maquina.findUnique({ where: { id: parsed.data.maquinaId }, select: { nombre: true } });
    await logHours({ otId: parsed.data.otId, horas: horasNum, maquina: m?.nombre ?? undefined, nota: parsed.data.nota ?? undefined });
  }

  bumpAll(parsed.data.maquinaId);
  return { ok: true, id: e.id, message: "Evento registrado" };
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
  id: z.string().uuid(), // mantenimiento
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
