"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanWriteWorkorders } from "@/app/lib/guards";
import { logHoursBulk, logPieces } from "@/app/server/services/production";

// Reusamos la lógica robusta existente del módulo de OT
import { logProduction as logProductionOT, logFinishedPieces as logFinishedPiecesOT } from "../ot/actions";

type R = { ok: true; message?: string } | { ok: false; message: string };

function bumpControl(otIds: string[] = []) {
  // Invalida listados y vistas detalle de OTs y el tablero de control
  revalidateTag(cacheTags.workorders);
  revalidateTag(cacheTags.worklogs(""));   // usado por overview agregada
  for (const id of otIds) {
    revalidateTag(cacheTags.workorder(id));
    revalidateTag(cacheTags.worklogs(id));
  }
  revalidatePath("/control", "page");
}

/* -------------------------------------------------------------------------- */
/*                    Wrappers 1: acciones simples (una OT)                   */
/* -------------------------------------------------------------------------- */

export async function logProduction(fd: FormData) {
  // delega en actions de OT (mantiene validaciones y side-effects)
  const r = await logProductionOT(fd);
  // fuerza refresco del dashboard
  const otId = String(fd.get("otId") || "");
  bumpControl(otId ? [otId] : []);
  return r;
}

export async function logFinishedPieces(fd: FormData) {
  const r = await logFinishedPiecesOT(fd);
  const otId = String(fd.get("otId") || "");
  bumpControl(otId ? [otId] : []);
  return r;
}

/* -------------------------------------------------------------------------- */
/*                        Acciones bulk (optimización)                         */
/* -------------------------------------------------------------------------- */

/** Registrar múltiples partes de producción (horas) en una sola transacción. */
const BulkHoursSchema = z.object({
  entries: z
    .array(
      z.object({
        otId: z.string().uuid(),
        horas: z.coerce.number().positive(),
        maquina: z.string().max(100).optional(),
        nota: z.string().max(300).optional(),
      })
    )
    .min(1),
});

export async function bulkLogProduction(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  let payload: unknown;
  try { payload = JSON.parse(String(fd.get("entries") || "[]")); } catch { return { ok:false, message:"Formato inválido (entries)" }; }
  const parsed = BulkHoursSchema.safeParse({ entries: payload });
  if(!parsed.success) return { ok:false, message:"Datos inválidos" };
  const r = await logHoursBulk(parsed.data.entries.map(e=>({ otId: e.otId, horas: Number(e.horas), maquina: e.maquina, nota: e.nota })));
  if(r.ok) bumpControl(Array.from(new Set(parsed.data.entries.map(e=>e.otId))));
  return r;
}

/** Registrar piezas terminadas para varias OTs (usa la lógica existente por OT). */
const BulkPiecesSchema = z.object({
  items: z
    .array(
      z.object({
        otId: z.string().uuid(),
        piezaId: z.string().uuid(),
        cantidad: z.coerce.number().positive(),
      })
    )
    .min(1),
});

export async function bulkLogFinishedPieces(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  let payload: unknown;
  try { payload = JSON.parse(String(fd.get("items") || "[]")); } catch { return { ok:false, message:"Formato inválido (items)" }; }
  const parsed = BulkPiecesSchema.safeParse({ items: payload });
  if(!parsed.success) return { ok:false, message:"Datos inválidos" };
  // Agrupar por OT y usar servicio para cada grupo (para mantener transacciones por OT)
  const groups = new Map<string, { piezaId:string; cantidad:number }[]>();
  for(const it of parsed.data.items){
    const arr = groups.get(it.otId) ?? [];
    arr.push({ piezaId: it.piezaId, cantidad: Number(it.cantidad) });
    groups.set(it.otId, arr);
  }
  for(const [otId, items] of groups.entries()){
    const r = await logPieces({ otId, items });
    if(!r.ok) return r;
  }
  bumpControl(Array.from(groups.keys()));
  return { ok:true, message:"Producción registrada" };
}

/* -------------------------------------------------------------------------- */
/*                     Utilidad: refrescar tablero manual                     */
/* -------------------------------------------------------------------------- */

export async function revalidateControl(): Promise<R> {
  bumpControl();
  return { ok: true, message: "Tablero actualizado" };
}
