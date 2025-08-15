"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { assertCanWriteWorkorders } from "@/app/lib/guards";

type R = { ok: true; message?: string; id?: string; codigo?: string } | { ok: false; message: string };
const D = (n: number | string | null | undefined) => new Prisma.Decimal(n ?? 0);

function bumpAll(otId?: string) {
  revalidatePath("/ot", "page");                 // listado
  if (otId) revalidatePath(`/ot/${otId}`, "page"); // detalle
}

/* ------------------- Helpers de negocio / estado ------------------- */

/**
 * Recalcula y actualiza el estado de la OT según:
 *  - IN_PROGRESS: si la cobertura de materiales planificados emitidos es 100%
 *  - DONE: si todas las piezas tienen qtyHecha >= qtyPlan
 *
 * TIP: Si el módulo de Control de Producción actualiza qtyHecha, conviene invocar
 * este helper desde allí también después de registrar producción.
 */
export async function recomputeOTState(otId: string) {
  const [ot, mats, piezas] = await Promise.all([
    prisma.ordenTrabajo.findUnique({ where: { id: otId }, select: { estado: true } }),
    prisma.oTMaterial.findMany({ where: { otId } }),
    prisma.oTPieza.findMany({ where: { otId }, select: { qtyPlan: true, qtyHecha: true } }),
  ]);
  if (!ot) return;

  // Cobertura materiales (solo considera planificados con qtyPlan > 0)
  let plan = 0, emit = 0;
  for (const m of mats) {
    const p = Number(m.qtyPlan || 0);
    const e = Number(m.qtyEmit || 0);
    if (p > 0) { plan += p; emit += Math.min(e, p); }
  }
  const coverage = plan > 0 ? emit / plan : 0;

  // ¿Todas las piezas terminadas?
  const allPiecesDone = piezas.length > 0
    ? piezas.every(p => Number(p.qtyHecha || 0) >= Number(p.qtyPlan || 0))
    : false;

  let next: "IN_PROGRESS" | "DONE" | null = null;

  if (allPiecesDone) {
    next = "DONE";
  } else if (coverage >= 1) {
    if (ot.estado === "DRAFT" || ot.estado === "OPEN") next = "IN_PROGRESS";
  }

  if (next) {
    await prisma.ordenTrabajo.update({ where: { id: otId }, data: { estado: next } });
    bumpAll(otId);
  }
}

/* --------------------------- Schemas --------------------------- */

const UpdateHeaderSchema = z.object({
  id: z.string().uuid(),
  clienteId: z.string().uuid().nullable().optional(),
  prioridad: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
  notas: z.string().max(500).optional(),
  acabado: z.string().max(200).optional(),
  materialesPlan: z.array(
    z.object({
      sku: z.string(),
      qtyPlan: z.coerce.number().nonnegative()
    })
  ).optional(),
});

const EmitMaterialsSchema = z.object({
  otId: z.string().uuid(),
  items: z.array(
    z.object({
      sku: z.string().min(1),
      qty: z.coerce.number().positive()
    })
  ).min(1),
});

const StartOTSchema = z.object({
  otId: z.string().uuid(),
});

const ManualSCSchema = z.object({
  otId: z.string().uuid(),
  nota: z.string().max(300).optional(),
});

/* ----------------------------- Actions ----------------------------- */

/** Crear OT (desde FormData). Sin registro de horas; SC por faltantes es manual */
export async function createOT(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();

  // Llegan:
  // - piezas: [{ productoId?: string|null, descripcion?: string|null, qtyPlan: number }]
  // - materiales: [{ productoId: string, qtyPlan: number }]
  let piezasRaw: Array<{ productoId?: string|null; descripcion?: string|null; qtyPlan: number }> = [];
  let matsRaw: Array<{ productoId: string; qtyPlan: number }> = [];

  try {
    piezasRaw = JSON.parse(String(fd.get("piezas") ?? "[]"));
    matsRaw   = JSON.parse(String(fd.get("materiales") ?? "[]"));
  } catch {
    return { ok: false, message: "Datos inválidos (JSON)" };
  }

  const payload = {
    piezas: piezasRaw
      .filter(p => (p.productoId || p.descripcion) && Number(p.qtyPlan) > 0)
      .map(p => ({ sku: p.productoId ?? undefined, descripcion: p.descripcion ?? undefined, qty: Number(p.qtyPlan) })),
    materiales: matsRaw
      .filter(m => m.productoId && Number(m.qtyPlan) > 0)
      .map(m => ({ sku: m.productoId, qty: Number(m.qtyPlan) })),
    clienteId: fd.get("clienteId")?.toString() || undefined,
    prioridad: (fd.get("prioridad")?.toString() as "LOW"|"MEDIUM"|"HIGH"|"URGENT") || "MEDIUM",
    acabado: fd.get("acabado")?.toString() || undefined,
    notas: fd.get("notas")?.toString() || undefined,
  };

  if (payload.piezas.length === 0) return { ok: false, message: "Agrega al menos una pieza válida" };
  if (payload.materiales.length === 0) return { ok: false, message: "Agrega materiales válidos" };

  // --- Validación/normalización de SKUs ---
  const piezaSkus = payload.piezas.map(p => p.sku).filter(Boolean) as string[];
  const matSkus   = payload.materiales.map(m => m.sku);
  const allSkus   = Array.from(new Set([...piezaSkus, ...matSkus]));

  const existing = new Set(
    (await prisma.producto.findMany({ where: { sku: { in: allSkus } }, select: { sku: true } }))
      .map(r => r.sku)
  );

  // Si hay materiales con SKU inexistente => error (material debe existir sí o sí)
  const unknownMats = matSkus.filter(s => !existing.has(s));
  if (unknownMats.length) {
    return { ok: false, message: `Material(es) inexistente(s): ${unknownMats.join(", ")}` };
  }

  // Piezas: si el SKU no existe, se guarda como pieza libre (productoId=null)
  const piezasSafe = payload.piezas.map(p => {
    const skuOk = p.sku && existing.has(p.sku);
    const descripcion =
      (p.descripcion?.trim() || "") ||
      (!skuOk && p.sku ? String(p.sku) : "") || // si escribió un "código" que no existe, úsalo como descripción
      "Pieza sin código";
    return { sku: skuOk ? p.sku : undefined, descripcion, qty: p.qty };
  });

  const created = await prisma.$transaction(async (tx) => {
    const codigo = await nextOTCode(tx);
    const ot = await tx.ordenTrabajo.create({
      data: {
        clienteId: payload.clienteId ?? null,
        prioridad: payload.prioridad,
        notas: payload.notas?.trim() || null,
        acabado: payload.acabado?.trim() || null,
        estado: "OPEN",
        codigo,
      },
      select: { id: true, codigo: true }
    });

    // Piezas (productoId sólo si el SKU existe)
    if (piezasSafe.length) {
      await tx.oTPieza.createMany({
        data: piezasSafe.map(x => ({
          otId: ot.id,
          productoId: x.sku || null,
          descripcion: x.descripcion,
          qtyPlan: new Prisma.Decimal(x.qty),
          qtyHecha: new Prisma.Decimal(0),
        })),
      });
    }

    // Materiales planificados (ya validados que existen)
    if (payload.materiales.length) {
      await tx.oTMaterial.createMany({
        data: payload.materiales.map(m => ({
          otId: ot.id,
          productoId: m.sku,
          qtyPlan: new Prisma.Decimal(m.qty),
          qtyEmit: new Prisma.Decimal(0),
        })),
      });
    }

    return ot; // { id, codigo }
  });

  bumpAll(created.id);
  return { ok: true, id: created.id, codigo: created.codigo, message: "OT creada" };
}

/** Editar cabecera (cliente/prioridad/notas/acabado y plan de materiales) */
export async function updateOTHeader(payload: z.infer<typeof UpdateHeaderSchema>): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = UpdateHeaderSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { id, clienteId, prioridad, notas, acabado, materialesPlan } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.ordenTrabajo.update({
      where: { id },
      data: {
        clienteId: (clienteId ?? undefined) || null,
        prioridad: prioridad ?? undefined,
        notas: notas?.trim() ?? undefined,
        acabado: acabado?.trim() ?? undefined,
      },
    });

    if (Array.isArray(materialesPlan)) {
      // Sincroniza qtyPlan por SKU (crea/actualiza)
      for (const mp of materialesPlan) {
        const exists = await tx.oTMaterial.findUnique({ where: { otId_productoId: { otId: id, productoId: mp.sku } } });
        if (!exists && mp.qtyPlan > 0) {
          await tx.oTMaterial.create({
            data: { otId: id, productoId: mp.sku, qtyPlan: D(mp.qtyPlan), qtyEmit: D(0) },
          });
        } else if (exists) {
          await tx.oTMaterial.update({
            where: { otId_productoId: { otId: id, productoId: mp.sku } },
            data: { qtyPlan: D(mp.qtyPlan) },
          });
        }
      }
    }
  });

  await recomputeOTState(id);
  bumpAll(id);
  return { ok: true, message: "OT actualizada" };
}

/** Emisión de materiales (movimientos SALIDA_OT) vía diálogo */
export async function emitOTMaterials(payload: z.infer<typeof EmitMaterialsSchema>): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = EmitMaterialsSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { otId, items } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Validar stock suficiente para cada SKU
    const skus = Array.from(new Set(items.map(i => i.sku)));
    const products = await tx.producto.findMany({ where: { sku: { in: skus } }, select: { sku: true, costo: true } });

    const stockMap = new Map<string, number>();
    const stocks = await tx.movimiento.groupBy({
      by: ["productoId"],
      where: { productoId: { in: skus } },
      _sum: { cantidad: true },
    });
    for (const s of stocks) stockMap.set(s.productoId, Number(s._sum.cantidad || 0));

    for (const it of items) {
      const onHand = stockMap.get(it.sku) ?? 0;
      if (onHand < it.qty) {
        throw new Error(`Stock insuficiente para ${it.sku} (disp: ${onHand}, req: ${it.qty})`);
      }
    }

    // Registrar movimientos y actualizar OTMaterial.qtyEmit
    for (const it of items) {
      const p = products.find(pp => pp.sku === it.sku);
      const costoUnit = p ? Number(p.costo) : 0;

      await tx.movimiento.create({
        data: {
          productoId: it.sku,
          tipo: "SALIDA_OT",
          cantidad: D(-Math.abs(it.qty)), // convención: salidas negativas
          costoUnitario: D(costoUnit),
          refTabla: "OrdenTrabajo",
          refId: otId,
          nota: `Emisión a OT ${otId}`,
        },
      });

      // Upsert en OTMaterial (permite emitir incluso si no estaba planificado)
      await tx.oTMaterial.upsert({
        where: { otId_productoId: { otId, productoId: it.sku } },
        create: { otId, productoId: it.sku, qtyPlan: D(0), qtyEmit: D(it.qty) },
        update: { qtyEmit: new Prisma.Decimal((await getCurrentQtyEmit(tx, otId, it.sku)) + it.qty) },
      });
    }
  });

  await recomputeOTState(otId);
  bumpAll(otId);
  return { ok: true, message: "Material(es) emitido(s)" };
}

/** Arranque manual de OT: requiere ≥20% de cobertura de materiales emitidos */
export async function startOTManually(payload: z.infer<typeof StartOTSchema>): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = StartOTSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { otId } = parsed.data;
  const [ot, mats] = await Promise.all([
    prisma.ordenTrabajo.findUnique({ where: { id: otId }, select: { estado: true } }),
    prisma.oTMaterial.findMany({ where: { otId } }),
  ]);
  if (!ot) return { ok: false, message: "OT no encontrada" };
  if (ot.estado === "IN_PROGRESS" || ot.estado === "DONE") {
    return { ok: true, message: "La OT ya está iniciada o terminada" };
  }

  let plan = 0, emit = 0;
  for (const m of mats) {
    const p = Number(m.qtyPlan || 0);
    const e = Number(m.qtyEmit || 0);
    if (p > 0) { plan += p; emit += Math.min(e, p); }
  }
  const coverage = plan > 0 ? emit / plan : 0;

  if (coverage < 0.2) {
    return { ok: false, message: "Se requiere al menos 20% de materiales emitidos para iniciar" };
  }

  await prisma.ordenTrabajo.update({ where: { id: otId }, data: { estado: "IN_PROGRESS" } });
  bumpAll(otId);
  return { ok: true, message: "OT iniciada" };
}

/** Generar manualmente Solicitud de Compra por faltantes de materiales */
export async function createManualSCForOT(payload: z.infer<typeof ManualSCSchema>): Promise<R> {
  await assertCanWriteWorkorders();
  const me = await getCurrentUser();
  const user = me ? await prisma.userProfile.findFirst({ where: { email: me.email }, select: { id: true } }) : null;

  const parsed = ManualSCSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { otId, nota } = parsed.data;

  // Calcular faltantes = max(qtyPlan - qtyEmit - stockDisponible, 0)
  const mats = await prisma.oTMaterial.findMany({ where: { otId } });
  if (mats.length === 0) return { ok: false, message: "No hay materiales planificados" };

  const skus = mats.map(m => m.productoId);
  const stocks = await prisma.movimiento.groupBy({
    by: ["productoId"],
    where: { productoId: { in: skus } },
    _sum: { cantidad: true },
  });
  const stockMap = new Map(stocks.map(s => [s.productoId, Number(s._sum.cantidad || 0)]));

  const items: { productoId: string; cantidad: number }[] = [];
  for (const m of mats) {
    const plan = Number(m.qtyPlan || 0);
    const emit = Number(m.qtyEmit || 0);
    const need = Math.max(plan - emit, 0);
    const stock = stockMap.get(m.productoId) ?? 0;
    const falt = Math.max(need - stock, 0);
    if (falt > 0) items.push({ productoId: m.productoId, cantidad: falt });
  }

  if (items.length === 0) {
    return { ok: false, message: "No se encontraron faltantes para solicitar" };
  }

  const scId = await prisma.$transaction(async (tx) => {
    const sc = await tx.solicitudCompra.create({
      data: {
        solicitanteId: user?.id ?? (await ensureAdminUserId(tx)),
        otId,
        estado: "PENDING_ADMIN",
        notas: nota?.trim() || null,
      },
      select: { id: true }
    });

    await tx.sCItem.createMany({
      data: items.map(i => ({
        scId: sc.id,
        productoId: i.productoId,
        cantidad: D(i.cantidad),
      })),
    });

    return sc.id;
  });

  bumpAll(otId);
  return { ok: true, id: scId, message: "Solicitud de compra creada" };
}

/** Cancelar/Reabrir OT (opcional) */
export async function setOTStatus(otId: string, estado: "CANCELLED" | "OPEN"): Promise<R> {
  await assertCanWriteWorkorders();
  await prisma.ordenTrabajo.update({ where: { id: otId }, data: { estado } });
  bumpAll(otId);
  return { ok: true, message: "Estado actualizado" };
}

/* ---------------------- Wrappers de compatibilidad ---------------------- */

/** Compat con UI: issueMaterials(fd) -> emitOTMaterials(...) */
export async function issueMaterials(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const otId = String(fd.get("otId") || "");
  if (!otId) return { ok: false, message: "otId requerido" };

  let itemsRaw: Array<{ productoId: string; cantidad: number }> = [];
  try { itemsRaw = JSON.parse(String(fd.get("items") ?? "[]")); } catch { /* noop */ }

  const items = itemsRaw
    .filter(i => i.productoId && Number(i.cantidad) > 0)
    .map(i => ({ sku: i.productoId, qty: Number(i.cantidad) }));

  return emitOTMaterials({ otId, items });
}

/** Compat con UI: crear SC desde faltantes calculados */
export async function createSCFromShortages(otId: string): Promise<R> {
  return createManualSCForOT({ otId, nota: undefined });
}

/** Compat con UI: setOTState(id, estado) con reglas pedidas */
export async function setOTState(id: string, estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED"): Promise<R> {
  await assertCanWriteWorkorders();

  if (estado === "IN_PROGRESS") {
    // Requiere ≥ 20% de cobertura
    const mats = await prisma.oTMaterial.findMany({ where: { otId: id }, select: { qtyPlan: true, qtyEmit: true } });
    let plan = 0, emit = 0;
    for (const m of mats) {
      const p = Number(m.qtyPlan || 0);
      const e = Number(m.qtyEmit || 0);
      if (p > 0) { plan += p; emit += Math.min(e, p); }
    }
    const coverage = plan > 0 ? emit / plan : 0;
    if (coverage < 0.2) return { ok: false, message: "Se requiere al menos 20% de materiales emitidos para iniciar" };
  }

  if (estado === "DONE") {
    // Validar piezas completas
    const piezas = await prisma.oTPieza.findMany({ where: { otId: id }, select: { qtyPlan: true, qtyHecha: true } });
    const allDone = piezas.length > 0
      ? piezas.every(p => Number(p.qtyHecha || 0) >= Number(p.qtyPlan || 0))
      : false;
    if (!allDone) return { ok: false, message: "Aún hay piezas pendientes" };
  }

  await prisma.ordenTrabajo.update({ where: { id }, data: { estado } });
  await recomputeOTState(id);
  bumpAll(id);
  return { ok: true, message: "Estado actualizado" };
}

/** Compat con UI: addMaterial ya no se usa (se edita en cabecera/plan) */
export async function addMaterial(_: FormData): Promise<R> {
  return { ok: false, message: "Obsoleto: usa 'Editar cabecera / plan' para materiales." };
}

/* ----------------------------- Utils ----------------------------- */

async function nextOTCode(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  // Genera un correlativo simple: OT-YYYYMM-#### (puedes reemplazar por tu lógica real)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `OT-${y}${m}-`;
  const last = await tx.ordenTrabajo.findFirst({
    where: { codigo: { startsWith: prefix } },
    orderBy: { creadaEn: "desc" },
    select: { codigo: true },
  });
  const n = last ? parseInt(last.codigo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

async function getCurrentQtyEmit(tx: Prisma.TransactionClient | typeof prisma, otId: string, sku: string) {
  const m = await tx.oTMaterial.findUnique({ where: { otId_productoId: { otId, productoId: sku } }, select: { qtyEmit: true } });
  return Number(m?.qtyEmit || 0);
}

async function ensureAdminUserId(tx: Prisma.TransactionClient | typeof prisma) {
  const u = await tx.userProfile.findFirst({ select: { id: true } });
  if (!u) throw new Error("No hay usuario para asignar solicitud");
  return u.id;
}
