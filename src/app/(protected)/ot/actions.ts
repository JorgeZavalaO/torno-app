"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanWriteWorkorders } from "@/app/lib/guards";
import { getCurrentUser } from "@/app/lib/auth";

type R = { ok: true; message?: string; id?: string; codigo?: string } | { ok: false; message: string };
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

function bumpAll(id?: string) {
  revalidateTag(cacheTags.workorders);
  if (id) {
    revalidateTag(cacheTags.workorder(id));
    revalidateTag(cacheTags.worklogs(id));
  }
  // inventario se afecta al emitir materiales
  revalidateTag(cacheTags.inventoryProducts);
  revalidateTag(cacheTags.inventoryMovs);
  revalidatePath("/ot", "page");
}

/* ---------------- Helpers ---------------- */
async function generateOTCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OT-${year}-`;
  const count = await prisma.ordenTrabajo.count({ where: { codigo: { startsWith: prefix } } });
  let code = `${prefix}${(count + 1).toString().padStart(3, "0")}`;
  // asegurar unicidad por si hay huecos
  while (await prisma.ordenTrabajo.findUnique({ where: { codigo: code } })) {
    const n = parseInt(code.slice(prefix.length), 10) + 1;
    code = `${prefix}${n.toString().padStart(3, "0")}`;
  }
  return code;
}

/* ---------------- Create / Update OT ---------------- */
const CreateOTSchema = z.object({
  clienteId: z.string().optional(),
  cotizacionId: z.string().optional(),
  notas: z.string().max(500).optional(),
  prioridad: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
  acabado: z.string().max(100).optional(),
  autoSC: z.coerce.boolean().optional().default(true),
  piezas: z.array(z.object({
    productoId: z.string().optional(),
    descripcion: z.string().max(200).optional(),
    qtyPlan: z.coerce.number().positive(),
  }).refine(v => !!(v.productoId || v.descripcion), { message: "Pieza sin código o descripción" })).min(1),
  materiales: z.array(z.object({
    productoId: z.string().min(1),
    qtyPlan: z.coerce.number().positive(),
  })).min(1),
});

export async function createOT(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = CreateOTSchema.safeParse({
    clienteId: (fd.get("clienteId") || undefined) as string | undefined,
    cotizacionId: (fd.get("cotizacionId") || undefined) as string | undefined,
    notas: (fd.get("notas") || undefined) as string | undefined,
    prioridad: (fd.get("prioridad") || undefined) as "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined,
  acabado: (fd.get("acabado") || undefined) as string | undefined,
  autoSC: (fd.get("autoSC") ?? "true") as unknown as boolean,
  piezas: JSON.parse(String(fd.get("piezas") || "[]")),
    materiales: JSON.parse(String(fd.get("materiales") || "[]")),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos de OT" };

  const codigo = await generateOTCode();
  // Sanitizar piezas: permitir códigos digitados que NO existen en producto -> se guardan como descripción
  const candidateSkus = Array.from(new Set(parsed.data.piezas.map(p => p.productoId).filter(Boolean))) as string[];
  const existing = candidateSkus.length
    ? await prisma.producto.findMany({ where: { sku: { in: candidateSkus } }, select: { sku: true } })
    : [];
  const existingSet = new Set(existing.map(p => p.sku));
  const piezasSanitized = parsed.data.piezas.map(p => {
    if (p.productoId && !existingSet.has(p.productoId)) {
      // código digitado no corresponde a un producto -> mover a descripción si no existe ya
      const desc = p.descripcion?.trim() ? p.descripcion.trim() : p.productoId;
      return { productoId: null as string | null, descripcion: desc, qtyPlan: p.qtyPlan };
    }
    return { productoId: p.productoId ?? null, descripcion: p.descripcion ?? null, qtyPlan: p.qtyPlan };
  });

  const o = await prisma.ordenTrabajo.create({
    data: ({
      codigo,
      estado: "OPEN",
      prioridad: (parsed.data.prioridad ?? "MEDIUM"),
      clienteId: parsed.data.clienteId ?? null,
      cotizacionId: parsed.data.cotizacionId ?? null,
      notas: parsed.data.notas ?? null,
      acabado: parsed.data.acabado ?? null,
      materiales: {
        create: parsed.data.materiales.map(m => ({
          productoId: m.productoId,
          qtyPlan: D(m.qtyPlan),
        })),
      },
      piezas: {
        create: piezasSanitized.map(p => ({
          productoId: p.productoId,
          descripcion: p.descripcion,
          qtyPlan: D(p.qtyPlan),
        })),
      },
    }),
    select: { id: true, codigo: true },
  });

  // Generar SC automática si faltan materiales
  if (parsed.data.autoSC) {
    try { await createSCFromShortages(o.id); } catch { /* noop */ }
  }
  bumpAll(o.id);
  return { ok: true, id: o.id, codigo: o.codigo, message: "OT creada" };
}

export async function setOTState(id: string, estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED"): Promise<R> {
  await assertCanWriteWorkorders();
  await prisma.ordenTrabajo.update({ where: { id }, data: { estado } });
  bumpAll(id);
  return { ok: true, message: "Estado actualizado" };
}

/* ---------------- Update OT metadata (cliente/prioridad) ---------------- */
const UpdateMetaSchema = z.object({
  otId: z.string().uuid(),
  clienteId: z.string().nullable().optional(),
  prioridad: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
  notas: z.string().max(500).optional(),
});

export async function updateOTMeta(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const rawCliente = fd.get("clienteId");
  const parsed = UpdateMetaSchema.safeParse({
    otId: fd.get("otId"),
    clienteId: rawCliente === "" ? null : (rawCliente || undefined),
    prioridad: (fd.get("prioridad") || undefined) as "LOW"|"MEDIUM"|"HIGH"|"URGENT"|undefined,
    notas: (fd.get("notas") || undefined) as string | undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { otId, clienteId, prioridad, notas } = parsed.data;
  await prisma.ordenTrabajo.update({
    where: { id: otId },
    data: {
      clienteId: typeof clienteId === "string" ? clienteId : clienteId === null ? null : undefined,
      prioridad: prioridad ?? undefined,
      notas: notas === undefined ? undefined : (notas || null),
    },
  });
  bumpAll(otId);
  return { ok: true, message: "OT actualizada" };
}

const AddMatSchema = z.object({
  otId: z.string().uuid(),
  productoId: z.string().min(1),
  qtyPlan: z.coerce.number().positive(),
});
export async function addMaterial(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = AddMatSchema.safeParse({
    otId: fd.get("otId"),
    productoId: fd.get("productoId"),
    qtyPlan: fd.get("qtyPlan"),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  try {
    await prisma.oTMaterial.upsert({
      where: { otId_productoId: { otId: parsed.data.otId, productoId: parsed.data.productoId } },
      update: { qtyPlan: new Prisma.Decimal(Number(parsed.data.qtyPlan)) },
      create: { otId: parsed.data.otId, productoId: parsed.data.productoId, qtyPlan: D(parsed.data.qtyPlan) },
    });
    bumpAll(parsed.data.otId);
    return { ok: true, message: "Material agregado/actualizado" };
  } catch {
    return { ok: false, message: "No se pudo agregar material" };
  }
}

/* ---------------- Emisión (consumo) de materiales ---------------- */

const IssueSchema = z.object({
  otId: z.string().uuid(),
  items: z.array(z.object({
    productoId: z.string().min(1),
    cantidad: z.coerce.number().positive(),
  })).min(1),
});

export async function issueMaterials(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = IssueSchema.safeParse({
    otId: fd.get("otId"),
    items: JSON.parse(String(fd.get("items") || "[]")),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { otId, items } = parsed.data;

  // leer materiales de la OT
  const mats = await prisma.oTMaterial.findMany({ where: { otId }, select: { productoId: true, qtyPlan: true, qtyEmit: true } });
  const planMap = new Map(mats.map(m => [m.productoId, { plan: Number(m.qtyPlan), emit: Number(m.qtyEmit) }]));

  // stock actual por los SKUs a emitir
  const skus = Array.from(new Set(items.map(i => i.productoId)));
  const sums = await prisma.movimiento.groupBy({ by: ["productoId"], where: { productoId: { in: skus } }, _sum: { cantidad: true } });
  const stockMap = new Map(sums.map(s => [s.productoId, Number(s._sum.cantidad || 0)]));

  // validaciones
  const errs: string[] = [];
  for (const it of items) {
    const info = planMap.get(it.productoId);
    if (!info) { errs.push(`SKU no pertenece a la OT: ${it.productoId}`); continue; }
    const pend = Math.max(0, info.plan - info.emit);
    if (it.cantidad > pend) errs.push(`Cantidad supera pendiente (${it.productoId})`);
    const stock = stockMap.get(it.productoId) ?? 0;
    if (it.cantidad > stock) errs.push(`Stock insuficiente (${it.productoId})`);
  }
  if (errs.length) return { ok: false, message: errs.join(" • ") };

  await prisma.$transaction(async (tx) => {
    // costo actual de referencia por SKU
    const prods = await tx.producto.findMany({ where: { sku: { in: skus } }, select: { sku: true, costo: true } });
    const costMap = new Map(prods.map(p => [p.sku, Number(p.costo)]));

    // movimientos SALIDA_OT (negativos) y update qtyEmit
    for (const it of items) {
      await tx.movimiento.create({
        data: {
          productoId: it.productoId,
          tipo: "SALIDA_OT",
          cantidad: new Prisma.Decimal(-Math.abs(it.cantidad)),  // negativo
          costoUnitario: new Prisma.Decimal(costMap.get(it.productoId) ?? 0),
          refTabla: "OT",
          refId: (await tx.ordenTrabajo.findUnique({ where: { id: otId }, select: { codigo: true } }))!.codigo,
          nota: "Consumo OT",
        },
      });
      await tx.oTMaterial.update({
        where: { otId_productoId: { otId, productoId: it.productoId } },
        data: { qtyEmit: { increment: new Prisma.Decimal(it.cantidad) } },
      });
    }
  });

  bumpAll(otId);
  return { ok: true, message: "Materiales emitidos" };
}
/** MRP-lite: genera una SC con faltantes de la OT (qtyPend - stock disponible). */
export async function createSCFromShortages(otId: string): Promise<R> {
  await assertCanWriteWorkorders();
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: "Sesión inválida" };

  const user = await prisma.userProfile.findFirst({ where: { email: me.email } });
  if (!user) return { ok: false, message: "Usuario no registrado" };

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id: otId },
    include: { materiales: true },
  });
  if (!ot) return { ok: false, message: "OT no encontrada" };

  // stock actual por SKU
  const skus = ot.materiales.map(m => m.productoId);
  const sums = await prisma.movimiento.groupBy({ by: ["productoId"], where: { productoId: { in: skus } }, _sum: { cantidad: true } });
  const stockMap = new Map(sums.map(s => [s.productoId, Number(s._sum.cantidad || 0)]));

  const items = ot.materiales
    .map(m => {
      const plan = Number(m.qtyPlan);
      const emit = Number(m.qtyEmit);
      const pend = Math.max(0, plan - emit);
      const stock = stockMap.get(m.productoId) ?? 0;
      const falt = Math.max(0, pend - stock);
      return { productoId: m.productoId, cantidad: falt };
    })
    .filter(i => i.cantidad > 0);

  if (items.length === 0) return { ok: false, message: "No hay faltantes para solicitar" };

  const sc = await prisma.solicitudCompra.create({
    data: {
      solicitanteId: user.id,
      otId: ot.codigo,               // guarda referencia de OT (usa tu string/código)
      estado: "PENDING_ADMIN",
      totalEstimado: D(0),
      items: {
        create: items.map(it => ({ productoId: it.productoId, cantidad: D(it.cantidad) })),
      },
      notas: "MRP-lite: generado automáticamente desde faltantes de OT",
    },
    select: { id: true },
  });

  bumpAll(otId);
  revalidateTag(cacheTags.purchasesSC);
  revalidatePath("/compras", "page");

  return { ok: true, id: sc.id, message: "Solicitud de compra creada desde faltantes" };
}

/** Parte de producción (horas/turno/nota) */
const LogSchema = z.object({
  otId: z.string().uuid(),
  horas: z.coerce.number().positive(),
  maquina: z.string().max(100).optional(),
  nota: z.string().max(300).optional(),
});
export async function logProduction(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = LogSchema.safeParse({
    otId: fd.get("otId"),
    horas: fd.get("horas"),
    maquina: (fd.get("maquina") || undefined) as string | undefined,
    nota: (fd.get("nota") || undefined) as string | undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del parte" };

  const me = await getCurrentUser();
  if (!me) return { ok: false, message: "Sesión inválida" };
  const user = await prisma.userProfile.findFirst({ where: { email: me.email }, select: { id: true } });
  if (!user) return { ok: false, message: "Usuario no registrado" };

  await prisma.parteProduccion.create({
    data: {
      otId: parsed.data.otId,
      userId: user.id,
      horas: D(parsed.data.horas),
      maquina: parsed.data.maquina ?? null,
      nota: parsed.data.nota ?? null,
    },
  });

  bumpAll(parsed.data.otId);
  return { ok: true, message: "Parte registrado" };
}

/* ---------------- Registrar piezas terminadas ---------------- */
const LogPiecesSchema = z.object({
  otId: z.string().uuid(),
  items: z.array(z.object({
    piezaId: z.string().uuid(),
    cantidad: z.coerce.number().positive(),
  })).min(1),
});

export async function logFinishedPieces(fd: FormData): Promise<R> {
  await assertCanWriteWorkorders();
  const parsed = LogPiecesSchema.safeParse({
    otId: fd.get("otId"),
    items: JSON.parse(String(fd.get("items") || "[]")),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };
  const { otId, items } = parsed.data;

  const ot = await prisma.ordenTrabajo.findUnique({ where: { id: otId }, select: { codigo: true } });
  if (!ot) return { ok: false, message: "OT no encontrada" };

  const pzClient = (prisma as unknown as { oTPieza: { findMany: (args: unknown)=>Promise<unknown[]> } }).oTPieza;
  const piezas = await pzClient.findMany({ where: { id: { in: items.map(i=>i.piezaId) }, otId }, select: { id: true, productoId: true } } as unknown) as Array<{ id: string; productoId: string | null }>;
  const piezaMap = new Map<string, { id: string; productoId: string | null }>(piezas.map((p) => [p.id, p]));

  await prisma.$transaction(async (tx) => {
    // actualizar qtyHecha y crear ingresos a inventario si corresponde
    for (const it of items) {
      const pz = piezaMap.get(it.piezaId);
      if (!pz) continue;

      const txPz = (tx as unknown as { oTPieza: { update: (args: unknown)=>Promise<unknown> } }).oTPieza;
      await txPz.update({ where: { id: it.piezaId }, data: { qtyHecha: { increment: D(it.cantidad) } } } as unknown);

      if (pz.productoId) {
        const prod = await tx.producto.findUnique({ where: { sku: pz.productoId }, select: { costo: true } });
        await tx.movimiento.create({
          data: ({
            productoId: pz.productoId,
            // usar string hasta que el cliente de Prisma regenere el enum
            tipo: "INGRESO_OT" as any,
            cantidad: D(it.cantidad),
            costoUnitario: D(Number(prod?.costo ?? 0)),
            refTabla: "OT",
            refId: ot.codigo,
            nota: "Producción terminada",
          }) as any,
        } as any);
      }
    }
  });

  bumpAll(otId);
  return { ok: true, message: "Producción registrada" };
}