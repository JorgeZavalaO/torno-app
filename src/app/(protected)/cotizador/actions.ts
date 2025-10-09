"use server";

import { z } from "zod";
import { Prisma, TipoCatalogo } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanReadQuotes, assertCanWriteQuotes } from "@/app/lib/guards";
import { assertCanWriteWorkorders } from "@/app/lib/guards";
import { revalidatePath as rp } from "next/cache";
import { getCostingValues } from "@/app/server/queries/costing-params";
import { getCostsByCategory } from "@/app/server/queries/machine-costing-categories";

type Result = { ok: true; message?: string; id?: string } | { ok: false; message: string };

const InputSchema = z.object({
  clienteId: z.string().uuid(),
  qty: z.coerce.number().int().min(1),
  materials: z.coerce.number().min(0),
  hours: z.coerce.number().min(0),
  kwh: z.coerce.number().min(0).default(0),
  validUntil: z.string().optional(), // ISO date
  notes: z.string().max(500).optional(),
  pedidoReferencia: z.string().max(100).optional(), // Referencia de pedido ERP
  tipoTrabajoId: z.string().uuid().optional(), // Tipo de trabajo seleccionado
  machineCategory: z.string().optional(), // Categoría de máquina para costos
});

/* ---------- Helpers Decimal ---------- */
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);
const n2 = (d: Prisma.Decimal) => Number(d.toFixed(2));

export async function listQuotes() {
  await assertCanReadQuotes();
  return prisma.cotizacion.findMany({ orderBy: { createdAt: "desc" } });
}

function bumpQuotesCache() {
  revalidateTag(cacheTags.quotes);
  revalidatePath("/cotizador", "page");
}

type TipoTrabajoPropiedades = {
  parent?: string;
  isSubcategory?: boolean;
};

export async function getTiposTrabajo() {
  await assertCanReadQuotes(); // O algún permiso apropiado
  // Centralizamos el acceso usando el servicio de catálogos (misma tabla, con cache)
  const tipos = await prisma.configuracionCatalogo.findMany({
    where: {
      tipo: TipoCatalogo.TIPO_TRABAJO,
      activo: true,
    },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      propiedades: true,
      codigo: true,
    },
  });

  // Separar tipos principales de subcategorías
  const principales = tipos.filter(t => {
    const props = t.propiedades as TipoTrabajoPropiedades;
    return !props?.isSubcategory;
  });
  const subcategorias = tipos.filter(t => {
    const props = t.propiedades as TipoTrabajoPropiedades;
    return props?.isSubcategory;
  });

  return {
    principales,
    subcategorias
  };
}

export async function createQuote(fd: FormData): Promise<Result> {
  await assertCanWriteQuotes();

  // --- Parsing de líneas detalladas (opcional) ---
  let piezasLines: Array<{ productoId?: string; descripcion?: string; qty: number }> = [];
  let materialesLines: Array<{ productoId?: string; descripcion?: string; qty: number; unitCost: number }> = [];
  try {
    const rawP = fd.get("piezas");
    if (rawP) {
      const arr = JSON.parse(String(rawP));
      if (Array.isArray(arr)) {
        piezasLines = arr
          .map(p => ({
            productoId: p.productoId || undefined,
            descripcion: p.descripcion || undefined,
            qty: Number(p.qty || 0)
          }))
          .filter(p => (p.productoId || p.descripcion) && p.qty > 0);
      }
    }
  } catch {}
  try {
    const rawM = fd.get("materialesDetalle");
    if (rawM) {
      const arr = JSON.parse(String(rawM));
      if (Array.isArray(arr)) {
        materialesLines = arr
          .map(m => ({
            productoId: m.productoId || undefined,
            descripcion: m.descripcion || undefined,
            qty: Number(m.qty || 0),
            unitCost: Number(m.unitCost || 0)
          }))
          .filter(m => (m.productoId || m.descripcion) && m.qty > 0 && m.unitCost >= 0);
      }
    }
  } catch {}

  const aggregatedQty = piezasLines.length ? piezasLines.reduce((s,p)=>s+p.qty,0) : Number(fd.get("qty") || 0);
  const aggregatedMaterials = (materialesLines.length ? materialesLines.reduce((s,m)=> s + (m.qty * m.unitCost), 0) : Number(fd.get("materials") || 0));

  const parsed = InputSchema.safeParse({
    clienteId: fd.get("clienteId"),
    qty: aggregatedQty,
    materials: aggregatedMaterials,
    hours: fd.get("hours"),
    kwh: fd.get("kwh") ?? 0,
    validUntil: fd.get("validUntil") || undefined,
    notes: fd.get("notes") || undefined,
    pedidoReferencia: fd.get("pedidoReferencia") || undefined,
    tipoTrabajoId: fd.get("tipoTrabajoId") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const input = parsed.data;
  if (input.qty < 1) return { ok: false, message: "Cantidad total debe ser >= 1" };

  // Validación adicional de líneas (si se enviaron) - al menos una pieza si se mandó array
  if (fd.get("piezas") && piezasLines.length === 0) {
    return { ok: false, message: "Agrega al menos una pieza válida" };
  }

  // Traemos parámetros actuales
  const v = await getCostingValues(); // { currency, gi, margin, kwhRate, ... }
  const currency = String(v.currency || "PEN");

  const gi = D(v.gi ?? 0);                 // 0.15
  const margin = D(v.margin ?? 0);         // 0.20
  
  // Obtener costos según categoría de máquina seleccionada
  const machineCategory = fd.get("machineCategory") ? String(fd.get("machineCategory")) : null;
  const categoryCosts = await getCostsByCategory(machineCategory);
  
  const hourlyRate = D(categoryCosts.laborCost);     // De categoría
  const depr = D(categoryCosts.deprPerHour);         // De categoría
  const kwhRate = D(categoryCosts.kwhRate);          // Compartido
  const tooling = D(categoryCosts.toolingPerPiece);  // Compartido
  const rent = D(categoryCosts.rentPerHour);         // Compartido

  // Cálculo
  const qty = D(input.qty);
  const materials = D(input.materials);
  const hours = D(input.hours);
  // kwh ya no se usa - ahora kwhRate es costo por hora

  const laborCost = hourlyRate.mul(hours);
  const energyCost = kwhRate.mul(hours); // Cambiado: ahora es por hora, no por kWh
  const deprCost = depr.mul(hours);
  const toolingCost = tooling.mul(qty);
  const rentCost = rent.mul(hours);

  const direct = materials.plus(laborCost).plus(energyCost).plus(deprCost).plus(toolingCost).plus(rentCost);

  const giAmount = direct.mul(gi);
  const subtotal = direct.plus(giAmount);
  const marginAmount = subtotal.mul(margin);
  const total = subtotal.plus(marginAmount);
  const unitPrice = qty.gt(0) ? total.div(qty) : total;

  const breakdown = {
    inputs: {
      qty: input.qty,
      materials: n2(materials), hours: n2(hours),
      // kwh: se eliminó, ya no se usa
      machineCategory, // Guardar categoría seleccionada
      piezasLines,
      materialesLines,
    },
    params: {
      currency, gi: Number(gi.toString()), margin: Number(margin.toString()),
      hourlyRate: Number(hourlyRate.toString()),
      kwhRate: Number(kwhRate.toString()),
      deprPerHour: Number(depr.toString()),
      toolingPerPiece: Number(tooling.toString()),
      rentPerHour: Number(rent.toString()),
    },
    costs: {
      materials: n2(materials),
      labor: n2(laborCost),
      energy: n2(energyCost),
      depreciation: n2(deprCost),
      tooling: n2(toolingCost),
      rent: n2(rentCost),
      direct: n2(direct),
      giAmount: n2(giAmount),
      subtotal: n2(subtotal),
      marginAmount: n2(marginAmount),
      total: n2(total),
      unitPrice: n2(unitPrice),
    },
  };

  // Obtener machineCategoryId si se proporcionó
  let machineCategoryId: string | null = null;
  if (machineCategory) {
    const categoryRecord = await prisma.machineCostingCategory.findUnique({
      where: { categoria: machineCategory },
      select: { id: true },
    });
    machineCategoryId = categoryRecord?.id ?? null;
  }

  // Crear cotización
  const created = await prisma.cotizacion.create({
    data: {
      clienteId: input.clienteId,
      currency,
      giPct: gi, marginPct: margin,
      hourlyRate, kwhRate, deprPerHour: depr, toolingPerPc: tooling, rentPerHour: rent,

      qty: input.qty,
      materials, hours,
      // kwh: 0, // Campo obsoleto - se puede eliminar de la base de datos en el futuro

      costDirect: direct,
      giAmount, subtotal, marginAmount, total, unitPrice,
      breakdown,

      machineCategoryId, // Guardar la categoría seleccionada

      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      notes: input.notes ?? null,
      pedidoReferencia: input.pedidoReferencia ?? null,
      tipoTrabajoId: input.tipoTrabajoId ?? null,
      status: "DRAFT",
    },
    select: { id: true },
  });

  bumpQuotesCache();
  return { ok: true, id: created.id, message: "Cotización creada" };
}

export async function updateQuoteStatus(
  quoteId: string,
  newStatus: "DRAFT" | "SENT" | "APPROVED" | "REJECTED",
  notes?: string
): Promise<Result> {
  await assertCanWriteQuotes();

  try {
    const quote = await prisma.cotizacion.findUnique({
      where: { id: quoteId },
      select: { id: true, status: true }
    });

    if (!quote) {
      return { ok: false, message: "Cotización no encontrada" };
    }

    await prisma.cotizacion.update({
      where: { id: quoteId },
      data: {
        status: newStatus,
        notes: notes || undefined,
        updatedAt: new Date(),
      },
    });

    bumpQuotesCache();
    
    const statusMessages = {
      DRAFT: "Cotización marcada como borrador",
      SENT: "Cotización marcada como enviada",
      APPROVED: "Cotización aprobada",
      REJECTED: "Cotización rechazada",
    };

    return { ok: true, message: statusMessages[newStatus] };
  } catch (error) {
    console.error("Error updating quote status:", error);
    return { ok: false, message: "Error al actualizar el estado de la cotización" };
  }
}

export async function updateQuote(quoteId: string, fd: FormData): Promise<Result> {
  await assertCanWriteQuotes();

  // Parsing líneas (igual que create)
  let piezasLines: Array<{ productoId?: string; descripcion?: string; qty: number }> = [];
  let materialesLines: Array<{ productoId?: string; descripcion?: string; qty: number; unitCost: number }> = [];
  try {
    const rawP = fd.get("piezas");
    if (rawP) {
      const arr = JSON.parse(String(rawP));
      if (Array.isArray(arr)) {
        piezasLines = arr
          .map(p => ({ productoId: p.productoId || undefined, descripcion: p.descripcion || undefined, qty: Number(p.qty || 0) }))
          .filter(p => (p.productoId || p.descripcion) && p.qty > 0);
      }
    }
  } catch {}
  try {
    const rawM = fd.get("materialesDetalle");
    if (rawM) {
      const arr = JSON.parse(String(rawM));
      if (Array.isArray(arr)) {
        materialesLines = arr
          .map(m => ({ productoId: m.productoId || undefined, descripcion: m.descripcion || undefined, qty: Number(m.qty || 0), unitCost: Number(m.unitCost || 0) }))
          .filter(m => (m.productoId || m.descripcion) && m.qty > 0 && m.unitCost >= 0);
      }
    }
  } catch {}
  const aggregatedQty = piezasLines.length ? piezasLines.reduce((s,p)=>s+p.qty,0) : Number(fd.get("qty") || 0);
  const aggregatedMaterials = (materialesLines.length ? materialesLines.reduce((s,m)=> s + (m.qty * m.unitCost), 0) : Number(fd.get("materials") || 0));

  const parsed = InputSchema.safeParse({
    clienteId: fd.get("clienteId"),
    qty: aggregatedQty,
    materials: aggregatedMaterials,
    hours: fd.get("hours"),
    kwh: fd.get("kwh") ?? 0,
    validUntil: fd.get("validUntil") || undefined,
    notes: fd.get("notes") || undefined,
    pedidoReferencia: fd.get("pedidoReferencia") || undefined,
    tipoTrabajoId: fd.get("tipoTrabajoId") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const input = parsed.data;
  if (input.qty < 1) return { ok: false, message: "Cantidad total debe ser >=1" };
  if (fd.get("piezas") && piezasLines.length === 0) return { ok: false, message: "Agrega al menos una pieza válida" };

  try {
    const existingQuote = await prisma.cotizacion.findUnique({
      where: { id: quoteId },
      select: { id: true, status: true }
    });

    if (!existingQuote) {
      return { ok: false, message: "Cotización no encontrada" };
    }

    if (existingQuote.status === "APPROVED") {
      return { ok: false, message: "No se pueden editar cotizaciones aprobadas" };
    }

    // Traemos parámetros actuales
    const v = await getCostingValues();
    const currency = String(v.currency || "PEN");

    const gi = D(v.gi ?? 0);
    const margin = D(v.margin ?? 0);

    // Obtener costos según categoría de máquina seleccionada
    const machineCategory = fd.get("machineCategory") ? String(fd.get("machineCategory")) : null;
    const categoryCosts = await getCostsByCategory(machineCategory);
    
    const hourlyRate = D(categoryCosts.laborCost);     // De categoría
    const depr = D(categoryCosts.deprPerHour);         // De categoría
    const kwhRate = D(categoryCosts.kwhRate);          // Compartido
    const tooling = D(categoryCosts.toolingPerPiece);  // Compartido
    const rent = D(categoryCosts.rentPerHour);         // Compartido

    // Recalcular con los nuevos valores
    const qty = D(input.qty);
    const materials = D(input.materials);
    const hours = D(input.hours);

    const laborCost = hourlyRate.mul(hours);
    const energyCost = kwhRate.mul(hours); // Ahora es por hora, no por kWh
    const deprCost = depr.mul(hours);
    const toolingCost = tooling.mul(qty);
    const rentCost = rent.mul(hours);

    const direct = materials.plus(laborCost).plus(energyCost).plus(deprCost).plus(toolingCost).plus(rentCost);

    const giAmount = direct.mul(gi);
    const subtotal = direct.plus(giAmount);
    const marginAmount = subtotal.mul(margin);
    const total = subtotal.plus(marginAmount);
    const unitPrice = qty.gt(0) ? total.div(qty) : total;

  const breakdown = {
      inputs: {
        qty: input.qty,
        materials: n2(materials), hours: n2(hours),
        machineCategory, // Guardar categoría
    piezasLines,
    materialesLines,
      },
      params: {
        currency, gi: Number(gi.toString()), margin: Number(margin.toString()),
        hourlyRate: Number(hourlyRate.toString()),
        kwhRate: Number(kwhRate.toString()),
        deprPerHour: Number(depr.toString()),
        toolingPerPiece: Number(tooling.toString()),
        rentPerHour: Number(rent.toString()),
      },
      costs: {
        materials: n2(materials),
        labor: n2(laborCost),
        energy: n2(energyCost),
        depreciation: n2(deprCost),
        tooling: n2(toolingCost),
        rent: n2(rentCost),
        direct: n2(direct),
        giAmount: n2(giAmount),
        subtotal: n2(subtotal),
        marginAmount: n2(marginAmount),
        total: n2(total),
        unitPrice: n2(unitPrice),
      },
    };

    // Obtener machineCategoryId si se proporcionó
    let machineCategoryId: string | null = null;
    if (machineCategory) {
      const categoryRecord = await prisma.machineCostingCategory.findUnique({
        where: { categoria: machineCategory },
        select: { id: true },
      });
      machineCategoryId = categoryRecord?.id ?? null;
    }

    // Actualizar cotización
    await prisma.cotizacion.update({
      where: { id: quoteId },
      data: {
        clienteId: input.clienteId,
        currency,
        giPct: gi, marginPct: margin,
        hourlyRate, kwhRate, deprPerHour: depr, toolingPerPc: tooling, rentPerHour: rent,

        qty: input.qty,
        materials, hours,

        costDirect: direct,
        giAmount, subtotal, marginAmount, total, unitPrice,
        breakdown,

        machineCategoryId, // Actualizar categoría

        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        notes: input.notes ?? null,
        pedidoReferencia: input.pedidoReferencia ?? null,
        tipoTrabajoId: input.tipoTrabajoId ?? null,
        updatedAt: new Date(),
      },
    });

    bumpQuotesCache();
    return { ok: true, message: "Cotización actualizada correctamente" };
  } catch (error) {
    console.error("Error updating quote:", error);
    return { ok: false, message: "Error al actualizar la cotización" };
  }
}

export async function deleteQuote(quoteId: string): Promise<Result> {
  await assertCanWriteQuotes();

  try {
    const quote = await prisma.cotizacion.findUnique({
      where: { id: quoteId },
      select: { id: true, status: true }
    });

    if (!quote) {
      return { ok: false, message: "Cotización no encontrada" };
    }

    // No permitir eliminar cotizaciones aprobadas
    if (quote.status === "APPROVED") {
      return { ok: false, message: "No se pueden eliminar cotizaciones aprobadas" };
    }

    await prisma.cotizacion.delete({
      where: { id: quoteId }
    });

    bumpQuotesCache();
    return { ok: true, message: "Cotización eliminada correctamente" };
  } catch (error) {
    console.error("Error deleting quote:", error);
    return { ok: false, message: "Error al eliminar la cotización" };
  }
}

/* -------------------------------------------------------------- */
// Generar OT desde una cotización (usa líneas detalladas del breakdown)
/* -------------------------------------------------------------- */

export async function createOTFromQuote(quoteId: string): Promise<Result> {
  await assertCanWriteQuotes();
  await assertCanWriteWorkorders();

  const quote = await prisma.cotizacion.findUnique({
    where: { id: quoteId },
    select: { id: true, status: true, clienteId: true, breakdown: true }
  });
  if (!quote) return { ok: false, message: "Cotización no encontrada" };
  if (quote.status !== "APPROVED") return { ok: false, message: "Solo se puede generar OT desde una cotización APROBADA" };

  // Si ya existe una OT vinculada a esta cotización, devolvemos la existente
  const existingOt = await prisma.ordenTrabajo.findFirst({ where: { cotizacionId: quoteId }, select: { id: true, codigo: true } });
  if (existingOt) {
    // revalidate minimal paths and return existing OT
    rp(`/ot/${existingOt.id}`);
    rp(`/cotizador/${quoteId}`);
    bumpQuotesCache();
  console.log(`[createOTFromQuote] OT ya existente para cotizacion ${quoteId}: ${existingOt.id} / ${existingOt.codigo}`);
    return { ok: true, id: existingOt.id, message: `OT ${existingOt.codigo} ya existente` };
  }

  type BreakdownShape = {
    inputs?: {
      piezasLines?: Array<{ productoId?: string; descripcion?: string; qty: number }>;
      materialesLines?: Array<{ productoId?: string; qty: number; unitCost?: number }>;
    };
  };

  const breakdown: unknown = quote.breakdown || {};
  const isBreakdown = (x: unknown): x is BreakdownShape =>
    !!x && typeof x === "object" && "inputs" in (x as Record<string, unknown>);

  const piezasLines: Array<{ productoId?: string; descripcion?: string; qty: number }> = isBreakdown(breakdown) && Array.isArray(breakdown.inputs?.piezasLines)
    ? (breakdown.inputs!.piezasLines as Array<{ productoId?: string; descripcion?: string; qty: number }>)
    : [];

  const materialesLines: Array<{ productoId?: string; qty: number; unitCost?: number }> = isBreakdown(breakdown) && Array.isArray(breakdown.inputs?.materialesLines)
    ? (breakdown.inputs!.materialesLines as Array<{ productoId?: string; qty: number; unitCost?: number }>)
    : [];

  if (!Array.isArray(piezasLines) || piezasLines.length === 0) {
    return { ok: false, message: "La cotización no tiene piezas detalladas para generar la OT" };
  }
    // materialesLines es opcional: si no hay materiales detallados, creamos la OT sin materiales.

  // ▼ Extraer costos del breakdown para snapshot en OT
  type BreakdownCosts = {
    materials?: number; labor?: number; energy?: number;
    depreciation?: number; tooling?: number; rent?: number;
    total?: number;
  };
  type BreakdownFull = {
    params?: { currency?: string };
    costs?: BreakdownCosts;
  };
  const bd = (breakdown as BreakdownFull) || {};
  const c: BreakdownCosts = bd?.costs || {};

  const quoteMaterials = Number(c.materials ?? 0);
  const quoteLabor     = Number(c.labor ?? 0);
  const quoteOverheads = Number(c.depreciation ?? 0) + Number(c.tooling ?? 0) + Number(c.rent ?? 0) + Number(c.energy ?? 0);
  const quoteTotal     = Number(c.total ?? (quoteMaterials + quoteLabor + quoteOverheads));

  // Generar código correlativo (duplicado ligero de lógica de ot/actions.ts)
  async function nextOTCode() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `OT-${y}${m}-`;
    const last = await prisma.ordenTrabajo.findFirst({
      where: { codigo: { startsWith: prefix } },
      orderBy: { creadaEn: "desc" },
      select: { codigo: true },
    });
    const n = last ? parseInt(last.codigo.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(n).padStart(4, "0")}`;
  }

  const created = await prisma.$transaction(async (tx) => {
    const codigo = await nextOTCode();
    const ot = await tx.ordenTrabajo.create({
      data: {
        clienteId: quote.clienteId || null,
        cotizacionId: quote.id,
        prioridad: "MEDIUM",
        estado: "OPEN",
        codigo,
        notas: null,

        // ▼ snapshot de la cotización
        currency: String((bd?.params?.currency) || "PEN"),
        costQuoteMaterials: D(quoteMaterials),
        costQuoteLabor:     D(quoteLabor),
        costQuoteOverheads: D(quoteOverheads),
        costQuoteTotal:     D(quoteTotal),
        costParams: bd?.params || undefined,
      },
      select: { id: true, codigo: true }
    });

    // Piezas
    await tx.oTPieza.createMany({
      data: piezasLines.filter(p => (p.productoId || p.descripcion) && p.qty > 0).map(p => ({
        otId: ot.id,
        productoId: p.productoId || null,
        descripcion: p.descripcion?.trim() || (p.productoId ? undefined : "Pieza"),
        qtyPlan: new Prisma.Decimal(p.qty),
        qtyHecha: new Prisma.Decimal(0),
      }))
    });

    // Materiales (solo los que tienen productoId y qty > 0)
      // Materiales (solo si vienen definidos y tienen productoId)
      const matToCreate = Array.isArray(materialesLines)
        ? materialesLines.filter(m => m.productoId && m.qty > 0).map(m => ({
          otId: ot.id,
          productoId: m.productoId!,
          qtyPlan: new Prisma.Decimal(m.qty),
          qtyEmit: new Prisma.Decimal(0),
        }))
        : [];
      if (matToCreate.length > 0) {
        await tx.oTMaterial.createMany({ data: matToCreate });
      }

  console.log(`[createOTFromQuote] OT creada: ${ot.id} / ${ot.codigo} para cotizacion ${quoteId}`);
  return ot;
  });

  // Revalidate vistas relevantes
  rp("/ot");
  rp(`/ot/${created.id}`);
  rp(`/cotizador/${quoteId}`);
  bumpQuotesCache();
  return { ok: true, id: created.id, message: `OT ${created.codigo} creada` };
}
