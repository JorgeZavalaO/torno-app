"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanWritePurchases } from "@/app/lib/guards";
import { getCurrentUser } from "@/app/lib/auth";
import { recomputeOTCosts } from "@/app/(protected)/ot/actions";

type Result = { ok: true; message?: string; id?: string; codigo?: string } | { ok: false; message: string };
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

/**
 * Calcula el costo promedio ponderado de un producto basado en los ingresos por compras.
 * Considera solo los últimos N movimientos de INGRESO_COMPRA para evitar impacto de 
 * ajustes o movimientos muy antiguos.
 */
async function calculateWeightedAverageCost(
  tx: Prisma.TransactionClient, 
  productoId: string, 
  newQuantity: number, 
  newCost: number,
  maxMovements: number = 10
): Promise<number> {
  // Obtener los últimos movimientos de ingreso por compra
  const movimientos = await tx.movimiento.findMany({
    where: { 
      productoId, 
      tipo: "INGRESO_COMPRA",
      cantidad: { gt: 0 } // Solo ingresos positivos
    },
    orderBy: { fecha: "desc" },
    take: maxMovements,
    select: { cantidad: true, costoUnitario: true }
  });

  // Calcular totales existentes
  const existingTotal = movimientos.reduce((acc, mov) => 
    acc + (Number(mov.cantidad) * Number(mov.costoUnitario)), 0
  );
  const existingQuantity = movimientos.reduce((acc, mov) => 
    acc + Number(mov.cantidad), 0
  );

  // Agregar el nuevo movimiento al cálculo
  const totalValue = existingTotal + (newQuantity * newCost);
  const totalQuantity = existingQuantity + newQuantity;

  // Evitar división por cero
  if (totalQuantity <= 0) return newCost;

  const averageCost = totalValue / totalQuantity;
  
  // Redondear a 2 decimales para consistencia
  return Math.round(averageCost * 100) / 100;
}

function bump() {
  revalidateTag(cacheTags.purchasesSC);
  revalidateTag(cacheTags.purchasesOC);
  revalidateTag(cacheTags.providers);
  revalidatePath("/compras", "page");
}

/* ----------------- Proveedores ------------------ */
const ProviderSchema = z.object({
  nombre: z.string().min(2),
  ruc: z.string().min(8),
  contacto: z.string().optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  currency: z.string().min(3).max(4).optional(), // ISO code (PEN, USD, EUR)
});

async function validateCurrency(code: string | undefined | null): Promise<string> {
  const fallback = "PEN";
  if (!code) return fallback;
  const normalized = code.toUpperCase();
  // Validar contra catálogo MONEDA si existe
  try {
    const exists = await prisma.configuracionCatalogo.findFirst({
      where: { tipo: "MONEDA", codigo: normalized, activo: true },
      select: { id: true },
    });
    return exists ? normalized : fallback;
  } catch { return fallback; }
}

export async function createProvider(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = ProviderSchema.safeParse({
    nombre: fd.get("nombre"),
    ruc: fd.get("ruc"),
    contacto: fd.get("contacto") || undefined,
    email: fd.get("email") || undefined,
    telefono: fd.get("telefono") || undefined,
    direccion: fd.get("direccion") || undefined,
    currency: fd.get("currency") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del proveedor" };
  try {
    const currency = await validateCurrency(parsed.data.currency);
    const { currency: _cIgnored, ...rest } = parsed.data;
    const p = await prisma.proveedor.create({ data: { ...rest, currency }, select: { id: true } });
    bump();
    return { ok: true, message: "Proveedor creado", id: p.id };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "RUC ya existe" };
    }
    return { ok: false, message: "No se pudo crear proveedor" };
  }
}

const ProviderUpdateSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(2).optional(),
  ruc: z.string().min(8).optional(),
  contacto: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  currency: z.string().min(3).max(4).optional().or(z.literal("")),
});

export async function updateProvider(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = ProviderUpdateSchema.safeParse({
    id: fd.get("id"),
    nombre: (fd.get("nombre") || undefined) as string | undefined,
    ruc: (fd.get("ruc") || undefined) as string | undefined,
    contacto: (fd.get("contacto") || undefined) as string | undefined,
    email: (fd.get("email") || undefined) as string | undefined,
    telefono: (fd.get("telefono") || undefined) as string | undefined,
    direccion: (fd.get("direccion") || undefined) as string | undefined,
    currency: (fd.get("currency") || undefined) as string | undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del proveedor" };

  const { id, ...rest } = parsed.data;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) {
      // convertir cadenas vacías a null para campos opcionales
      if (k === "currency") {
        data[k] = v === "" ? null : await validateCurrency(v);
      } else {
        data[k] = v === "" ? null : v;
      }
    }
  }

  try {
    await prisma.proveedor.update({ where: { id }, data });
    bump();
    return { ok: true, message: "Proveedor actualizado", id };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "RUC ya existe" };
    }
    return { ok: false, message: "No se pudo actualizar proveedor" };
  }
}

export async function deleteProvider(id: string): Promise<Result> {
  await assertCanWritePurchases();
  try {
    await prisma.proveedor.delete({ where: { id } });
    bump();
    return { ok: true, message: "Proveedor eliminado" };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code?: string }).code;
      if (code === "P2003") return { ok: false, message: "No se puede eliminar: tiene referencias" };
      if (code === "P2025") return { ok: false, message: "Proveedor no encontrado" };
    }
    return { ok: false, message: "No se pudo eliminar proveedor" };
  }
}

/* ----------------- Solicitudes de Compra (SC) ------------------ */
const SCItemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.coerce.number().positive(),
  costoEstimado: z.coerce.number().min(0).optional().nullable(),
});
const SCSchema = z.object({
  otId: z.string().optional(),
  notas: z.string().max(500).optional(),
  currency: z.string().min(3).max(4).optional(),
  items: z.array(SCItemSchema).min(1),
});

export async function createSC(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesión inválida" };

  // items vienen en JSON
  const json = fd.get("items") as string;
  const parsed = SCSchema.safeParse({
    otId: (fd.get("otId") || undefined) as string | undefined,
    notas: (fd.get("notas") || undefined) as string | undefined,
    currency: (fd.get("currency") || undefined) as string | undefined,
    items: json ? JSON.parse(json) : [],
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos de solicitud" };

  const { otId, notas, items, currency } = parsed.data;
  const totalEstimado = items.reduce(
    (acc, it) => acc + (Number(it.costoEstimado ?? 0) * Number(it.cantidad)),
    0
  );

  const solicitante = await prisma.userProfile.findFirst({ where: { email: user.email } });
  if (!solicitante) return { ok: false, message: "Usuario no registrado" };

  // Resolver otId: el cliente puede enviar el UUID o el código de la OT.
  let resolvedOtId: string | null = null;
  if (otId) {
    // intentar por id
    const otById = await prisma.ordenTrabajo.findUnique({ where: { id: otId }, select: { id: true } });
    if (otById) {
      resolvedOtId = otById.id;
    } else {
      // intentar por código
      const otByCode = await prisma.ordenTrabajo.findUnique({ where: { codigo: otId }, select: { id: true } });
      if (otByCode) {
        resolvedOtId = otByCode.id;
      } else {
        return { ok: false, message: "Orden de trabajo (OT) no encontrada" };
      }
    }
  }

  const scCurrency = await validateCurrency(currency);
  // Generar código anual incremental: SC-YYYY-0001
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;

  async function nextSCCode(): Promise<string> {
    const last = await prisma.solicitudCompra.findFirst({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
      orderBy: { codigo: "desc" },
    });
    const lastNum = last?.codigo ? parseInt(String(last.codigo).split("-")[2] || "0", 10) : 0;
    const num = String((lastNum || 0) + 1).padStart(4, "0");
    return `${prefix}${num}`;
  }

  let created: { id: string; codigo: string | null } | null = null;
  let createdCodigo: string | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const codigo = await nextSCCode();
    try {
      created = await prisma.solicitudCompra.create({
        data: {
          codigo,
          solicitanteId: solicitante.id,
          otId: resolvedOtId || null,
          estado: "PENDING_ADMIN",
          totalEstimado: D(totalEstimado),
          notas: notas || null,
          currency: scCurrency,
          items: {
            create: items.map((it) => ({
              productoId: it.productoId,
              cantidad: D(it.cantidad),
              costoEstimado: it.costoEstimado != null ? D(it.costoEstimado) : null,
            })),
          },
        },
        select: { id: true, codigo: true },
      });
      createdCodigo = codigo;
      break; // éxito
    } catch (e: unknown) {
      // Si colisiona por unique (carrera), reintentar con el siguiente código
      if ((e as { code?: string })?.code === "P2002") {
        continue;
      }
      throw e;
    }
  }
  if (!created) {
    // Fallback: crear sin código si la base aún no fue migrada
    const sc = await prisma.solicitudCompra.create({
      data: {
        solicitanteId: solicitante.id,
        otId: resolvedOtId || null,
        estado: "PENDING_ADMIN",
        totalEstimado: D(totalEstimado),
        notas: notas || null,
        currency: scCurrency,
        items: {
          create: items.map((it) => ({
            productoId: it.productoId,
            cantidad: D(it.cantidad),
            costoEstimado: it.costoEstimado != null ? D(it.costoEstimado) : null,
          })),
        },
      },
      select: { id: true },
    });
    bump();
    return { ok: true, id: sc.id, message: "Solicitud de compra creada (sin código — aplicar migración Prisma)" };
  }

  bump();
  return { ok: true, id: created.id, codigo: createdCodigo, message: `Solicitud de compra creada${createdCodigo ? ` (${createdCodigo})` : ""}` };
}

export async function setSCState(scId: string, estado: "PENDING_ADMIN"|"PENDING_GERENCIA"|"APPROVED"|"REJECTED"|"CANCELLED", nota?: string): Promise<Result> {
  await assertCanWritePurchases();
  const sc = await prisma.solicitudCompra.findUnique({ where: { id: scId }, select: { estado: true } });
  if (!sc) return { ok: false, message: "SC no encontrada" };

  // Reglas simples de transición
  const allowed = new Set([
    "PENDING_ADMIN:PENDING_GERENCIA",
    "PENDING_GERENCIA:APPROVED",
    "PENDING_ADMIN:REJECTED",
    "PENDING_GERENCIA:REJECTED",
    "APPROVED:CANCELLED",
    "PENDING_ADMIN:CANCELLED",
    "PENDING_GERENCIA:CANCELLED",
  ]);
  const key = `${sc.estado}:${estado}`;
  if (!allowed.has(key) && sc.estado !== estado) {
    return { ok: false, message: `Transición no permitida (${sc.estado} → ${estado})` };
  }

  await prisma.solicitudCompra.update({
    where: { id: scId },
    data: {
      estado,
      notas: nota ?? undefined,
      updatedAt: new Date(),
    },
  });

  bump();
  return { ok: true, message: "Estado actualizado" };
}

/* ----------------- SC: actualizar costos estimados ------------------ */
const SCUpdateCostsSchema = z.object({
  scId: z.string().uuid(),
  items: z.array(z.object({
    id: z.string().uuid(),
    costoEstimado: z.coerce.number().min(0).nullable().optional(), // null/undefined => limpiar
  })).min(1),
});

export async function updateSCCosts(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = SCUpdateCostsSchema.safeParse({
    scId: fd.get("scId"),
    items: JSON.parse(String(fd.get("items") || "[]")),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { scId, items } = parsed.data;

  // Reglas: permitir editar si la SC aún no tiene OCs o si sigue en revisión.
  const sc = await prisma.solicitudCompra.findUnique({
    where: { id: scId },
    select: { estado: true, ordenesCompra: { select: { id: true }, take: 1 } },
  });
  if (!sc) return { ok: false, message: "SC no encontrada" };

  const tieneOCs = (sc.ordenesCompra?.length || 0) > 0;
  const editable = sc.estado === "PENDING_ADMIN" || sc.estado === "PENDING_GERENCIA" || (!tieneOCs && sc.estado === "APPROVED");
  if (!editable) return { ok: false, message: "La SC ya no permite editar costos" };

  await prisma.$transaction(async (tx) => {
    for (const it of items) {
      await tx.sCItem.update({
        where: { id: it.id },
        data: { costoEstimado: it.costoEstimado == null ? null : D(it.costoEstimado) },
      });
    }
    // recomputar totalEstimado rápido
    const reload = await tx.sCItem.findMany({ where: { scId }, select: { cantidad: true, costoEstimado: true } });
    const total = reload.reduce((acc, r) => acc + Number(r.cantidad) * Number(r.costoEstimado ?? 0), 0);
    await tx.solicitudCompra.update({ where: { id: scId }, data: { totalEstimado: D(total) } });
  });

  bump();
  return { ok: true, message: "Costos actualizados" };
}

/* ----------------- Orden de Compra (OC) ------------------ */
const OCCreateSchema = z.object({
  scId: z.string().uuid(),
  proveedorId: z.string().uuid(),
  codigo: z.string().min(3),
  currency: z.string().min(3).max(4).optional(),
  items: z.array(z.object({
    productoId: z.string().min(1),
    cantidad: z.coerce.number().positive(),
    costoUnitario: z.coerce.number().min(0),
  })).min(1),
});

export async function createOC(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();

  const parsed = OCCreateSchema.safeParse({
    scId: fd.get("scId"),
    proveedorId: fd.get("proveedorId"),
    codigo: fd.get("codigo"),
    currency: (fd.get("currency") || undefined) as string | undefined,
    items: JSON.parse(String(fd.get("items") || "[]")),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos de OC" };

  const { scId, proveedorId, codigo, items, currency } = parsed.data;

  // 1) SC aprobada
  const sc = await prisma.solicitudCompra.findUnique({
    where: { id: scId },
    include: { items: { select: { id: true, productoId: true, cantidad: true, } } },
  });
  if (!sc) return { ok: false, message: "SC no existe" };
  if (sc.estado !== "APPROVED") return { ok: false, message: "SC debe estar APROBADA" };

  // 2) Proveedor válido
  const prov = await prisma.proveedor.findUnique({ where: { id: proveedorId }, select: { id: true, currency: true } });
  if (!prov) return { ok: false, message: "Proveedor inválido" };

  // 3) Calcular ASIGNADO previo por SCItem
  const scItemIds = sc.items.map(i => i.id);
  const asignados = await prisma.oCItem.groupBy({
    by: ["scItemId"],
    _sum: { cantidad: true },
    where: { scItemId: { in: scItemIds } },
  });
  const asignadoMap = new Map(scItemIds.map(id => [id, 0]));
  for (const a of asignados) asignadoMap.set(a.scItemId!, Number(a._sum.cantidad || 0));

  // 4) Pendiente por SCItem
  const pendientePorSCItem = new Map(
    sc.items.map(i => [i.id, Math.max(0, Number(i.cantidad) - Number(asignadoMap.get(i.id) || 0))])
  );
  // 5) Asignación automática por producto (FIFO)
  type SplitLine = { productoId: string; scItemId: string; cantidad: number; costoUnitario: number };
  const splits: SplitLine[] = [];

  for (const it of items) {
    let porAsignar = Number(it.cantidad);
    if (porAsignar <= 0) continue;

    // SCItems del mismo producto, ordenados (si tienes createdAt úsalo, aquí va por orden natural)
    const candidatos = sc.items.filter(sci => sci.productoId === it.productoId);

    for (const sci of candidatos) {
      const pend = Number(pendientePorSCItem.get(sci.id) || 0);
      if (pend <= 0) continue;

      const take = Math.min(porAsignar, pend);
      if (take > 0) {
        splits.push({
          productoId: it.productoId,
          scItemId: sci.id,
          cantidad: take,
          costoUnitario: Number(it.costoUnitario),
        });
        pendientePorSCItem.set(sci.id, pend - take);
        porAsignar -= take;
        if (porAsignar <= 0) break;
      }
    }

    if (porAsignar > 0) {
      return { ok: false, message: `Cantidad supera lo pendiente para el producto ${it.productoId}` };
    }
  }

  const total = splits.reduce((acc, s) => acc + s.costoUnitario * s.cantidad, 0);
  const ocCurrency = await validateCurrency(currency || prov.currency || undefined);

  try {
    const oc = await prisma.$transaction(async (tx) => {
      const created = await tx.ordenCompra.create({
        data: {
          scId,
          proveedorId,
          codigo,
          estado: "OPEN",
          total: D(total),
          currency: ocCurrency,
          items: {
            create: splits.map(s => ({
              productoId: s.productoId,
              cantidad: D(s.cantidad),
              costoUnitario: D(s.costoUnitario),
              scItemId: s.scItemId, // <— vínculo de cobertura
            })),
          },
        },
        select: { id: true, codigo: true },
      });
      return created;
    });

    bump();
    return { ok: true, id: oc.id, codigo: oc.codigo, message: "OC creada" };
  } catch (e: unknown) {
    // Mejora de mensajes
    if (e && typeof e === "object" && "code" in e) {
      const code = (e as { code?: string }).code;
      // Unique constraint
      if (code === "P2002") {
        const meta = (e as unknown as { meta?: { target?: string | string[] } }).meta;
        const target = Array.isArray(meta?.target)
          ? meta.target
          : (typeof meta?.target === "string" ? [meta.target] : []);
        if (Array.isArray(target)) {
          if (target.includes("codigo")) return { ok: false, message: "Código de OC ya existe" };
        }
        return { ok: false, message: "Violación de unicidad al crear la OC" };
      }
      // Foreign key
      if (code === "P2003") {
        return { ok: false, message: "Referencia inválida (proveedor o producto inexistente)" };
      }
    }
    return { ok: false, message: "No se pudo crear OC" };
  }
}

/**
 * Recepción completa de OC (MVP): ingresa todo lo pendiente a Inventario con costo de la OC.
 * Si quieres recepción parcial, este método puede recibir items seleccionados con cantidades recibidas.
 */
const OCReceiveSchema = z.object({
  ocId: z.string().uuid(),
  facturaUrl: z.string().url().optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        cantidad: z.coerce.number().positive(),
      })
    )
    .optional(),
});

export async function receiveOC(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = OCReceiveSchema.safeParse({
    ocId: fd.get("ocId"),
    facturaUrl: (fd.get("facturaUrl") || undefined) as string | undefined,
    items: (() => {
      const raw = fd.get("items");
      if (!raw) return undefined;
      try { return JSON.parse(String(raw)); } catch { return undefined; }
    })(),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos de recepción" };

  const { ocId, facturaUrl, items } = parsed.data;

  const oc = await prisma.ordenCompra.findUnique({
    where: { id: ocId },
    include: { items: true },
  });
  if (!oc) return { ok: false, message: "OC no encontrada" };
  // Permitir recepción mientras la OC esté OPEN o PARTIAL (puede haber recepciones sucesivas)
  if (!(oc.estado === "OPEN" || oc.estado === "PARTIAL")) return { ok: false, message: "La OC no está abierta para recepción" };

  // Calcular cantidades pedidas por producto y recibidas previas por producto
  const orderedBySku = oc.items.reduce<Record<string, number>>((acc, it) => {
    acc[it.productoId] = (acc[it.productoId] ?? 0) + Number(it.cantidad);
    return acc;
  }, {});

  const prevMovs = await prisma.movimiento.findMany({
    where: { refTabla: "OC", refId: oc.codigo },
    select: { productoId: true, cantidad: true },
  });
  const receivedBySku = prevMovs.reduce<Record<string, number>>((acc, m) => {
    acc[m.productoId] = (acc[m.productoId] ?? 0) + Number(m.cantidad);
    return acc;
  }, {});
  const pendingBySku = Object.fromEntries(
    Object.entries(orderedBySku).map(([sku, total]) => [sku, Number(total) - Number(receivedBySku[sku] ?? 0)])
  );

  // Resolver recepción total vs parcial
  const isPartialPayload = Array.isArray(items) && items.length > 0;

  let finalEstado: "OPEN" | "PARTIAL" | "RECEIVED" = "OPEN";

  await prisma.$transaction(async (tx) => {
  if (!isPartialPayload) {
      // Recepción total: ingresar solo lo que queda pendiente por SKU (evita reingresar movimientos previos)
      for (const it of oc.items) {
        const pending = Number(pendingBySku[it.productoId] ?? 0);
        if (pending <= 0) continue; // nada por ingresar
        await tx.movimiento.create({
          data: {
            productoId: it.productoId,
            tipo: "INGRESO_COMPRA",
            cantidad: new Prisma.Decimal(pending), // positivo
            costoUnitario: it.costoUnitario,
            refTabla: "OC",
            refId: oc.codigo,
            nota: "Recepción OC (total)",
          },
        });
        
        // Calcular y actualizar costo promedio ponderado
        const avgCost = await calculateWeightedAverageCost(
          tx, 
          it.productoId, 
          pending, 
          Number(it.costoUnitario)
        );
        await tx.producto.update({ 
          where: { sku: it.productoId }, 
          data: { costo: new Prisma.Decimal(avgCost) } 
        });
        pendingBySku[it.productoId] = 0;
      }
  } else {
      // Recepción parcial: validar contra pendientes por SKU
      // Construir mapa de costo por SKU (usa el último costoUnitario de la OC para ese SKU)
      const costBySku = oc.items.reduce<Record<string, number>>((acc, it) => {
        acc[it.productoId] = Number(it.costoUnitario);
        return acc;
      }, {});

      for (const entry of items!) {
        const sku = entry.productoId;
        const qty = Number(entry.cantidad);
    const pending = Number(pendingBySku[sku] ?? 0);
        if (!(sku in orderedBySku)) {
          throw new Error(`Producto no pertenece a la OC: ${sku}`);
        }
        if (qty <= 0) {
          throw new Error(`Cantidad inválida para ${sku}`);
        }
        if (qty > pending) {
          throw new Error(`Cantidad supera lo pendiente para ${sku}`);
        }
        await tx.movimiento.create({
          data: {
            productoId: sku,
            tipo: "INGRESO_COMPRA",
            cantidad: new Prisma.Decimal(qty),
            costoUnitario: new Prisma.Decimal(costBySku[sku] ?? 0),
            refTabla: "OC",
            refId: oc.codigo,
            nota: "Recepción OC (parcial)",
          },
        });
        
        // Calcular y actualizar costo promedio ponderado
        const avgCost = await calculateWeightedAverageCost(
          tx, 
          sku, 
          qty, 
          Number(costBySku[sku] ?? 0)
        );
        await tx.producto.update({ 
          where: { sku }, 
          data: { costo: new Prisma.Decimal(avgCost) } 
        });
        pendingBySku[sku] = pending - qty;
      }
    }

    // Determinar estado final tras los movimientos aplicados
    const totalPendiente = Object.values(pendingBySku).reduce((s, v) => s + Number(v), 0);
    const totalPedido = Object.values(orderedBySku).reduce((s, v) => s + Number(v), 0);
  if (totalPendiente === 0) finalEstado = "RECEIVED";
  else if (totalPendiente === totalPedido) finalEstado = oc.estado as typeof finalEstado; // se mantiene estado anterior si no se recibió nada nuevo
  else finalEstado = "PARTIAL";

    await tx.ordenCompra.update({
      where: { id: oc.id },
      data: {
        estado: finalEstado,
        facturaUrl: facturaUrl ?? oc.facturaUrl ?? null,
        fecha: new Date(),
      },
    });
  });

  bump();
  revalidateTag(cacheTags.inventoryProducts);
  revalidateTag(cacheTags.inventoryMovs);

  // Recalcular costos de la OT asociada si la OC proviene de una SC vinculada a una OT
  const sc = await prisma.solicitudCompra.findUnique({
    where: { id: oc.scId },
    select: { otId: true }
  });
  if (sc?.otId) {
    try { await recomputeOTCosts(sc.otId); } catch {}
  }

  return { ok: true, message: "Mercadería recepcionada", newEstado: finalEstado } as unknown as Result & { newEstado?: string };
}

/**
 * Recalcula los costos promedio ponderado de todos los productos basado en su historial de compras.
 * Útil para aplicar la nueva lógica a productos existentes.
 */
export async function recalculateAllProductCosts(): Promise<Result> {
  await assertCanWritePurchases();
  
  try {
    const productos = await prisma.producto.findMany({
      select: { sku: true }
    });

    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const producto of productos) {
        // Obtener movimientos de ingreso por compra para este producto
        const movimientos = await tx.movimiento.findMany({
          where: { 
            productoId: producto.sku, 
            tipo: "INGRESO_COMPRA",
            cantidad: { gt: 0 }
          },
          orderBy: { fecha: "desc" },
          take: 10, // Últimos 10 movimientos
          select: { cantidad: true, costoUnitario: true }
        });

        if (movimientos.length === 0) continue; // Sin historial de compras

        // Calcular promedio ponderado
        const totalValue = movimientos.reduce((acc, mov) => 
          acc + (Number(mov.cantidad) * Number(mov.costoUnitario)), 0
        );
        const totalQuantity = movimientos.reduce((acc, mov) => 
          acc + Number(mov.cantidad), 0
        );

        if (totalQuantity > 0) {
          const averageCost = Math.round((totalValue / totalQuantity) * 100) / 100;
          
          await tx.producto.update({
            where: { sku: producto.sku },
            data: { costo: new Prisma.Decimal(averageCost) }
          });
          
          updatedCount++;
        }
      }
    });

    bump();
    revalidateTag(cacheTags.inventoryProducts);
    
    return { 
      ok: true, 
      message: `Costos recalculados para ${updatedCount} productos` 
    };
  } catch (error) {
    console.error("Error recalculando costos:", error);
    return { 
      ok: false, 
      message: "Error al recalcular costos de productos" 
    };
  }
}
