"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanReadQuotes, assertCanWriteQuotes } from "@/app/lib/guards";
import { getCostingValues } from "@/app/server/queries/costing-params";

type Result = { ok: true; message?: string; id?: string } | { ok: false; message: string };

const InputSchema = z.object({
  clienteId: z.string().uuid(),
  otId: z.string().uuid().optional(),
  qty: z.coerce.number().int().min(1),
  materials: z.coerce.number().min(0),
  hours: z.coerce.number().min(0),
  kwh: z.coerce.number().min(0).default(0),
  validUntil: z.string().optional(), // ISO date
  notes: z.string().max(500).optional(),
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

  const forceMaterialsFlag = String(fd.get("forceMaterials") || "").toLowerCase() === "true";
  const aggregatedQty = piezasLines.length ? piezasLines.reduce((s,p)=>s+p.qty,0) : Number(fd.get("qty") || 0);
  const aggregatedMaterials = forceMaterialsFlag
    ? Number(fd.get("materials") || 0)
    : (materialesLines.length ? materialesLines.reduce((s,m)=> s + (m.qty * m.unitCost), 0) : Number(fd.get("materials") || 0));

  const parsed = InputSchema.safeParse({
    clienteId: fd.get("clienteId"),
    qty: aggregatedQty,
    materials: aggregatedMaterials,
    hours: fd.get("hours"),
    kwh: fd.get("kwh") ?? 0,
    validUntil: fd.get("validUntil") || undefined,
    notes: fd.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const input = parsed.data;
  if (input.qty < 1) return { ok: false, message: "Cantidad total debe ser >= 1" };

  // Validación adicional de líneas (si se enviaron) - al menos una pieza si se mandó array
  if (fd.get("piezas") && piezasLines.length === 0) {
    return { ok: false, message: "Agrega al menos una pieza válida" };
  }

  // Traemos parámetros actuales
  const v = await getCostingValues(); // { currency, gi, margin, hourlyRate, ... }
  const currency = String(v.currency || "PEN");

  const gi = D(v.gi ?? 0);                 // 0.15
  const margin = D(v.margin ?? 0);         // 0.20
  const hourlyRate = D(v.hourlyRate ?? 0);
  const kwhRate = D(v.kwhRate ?? 0);
  const depr = D(v.deprPerHour ?? 0);
  const tooling = D(v.toolingPerPiece ?? 0);
  const rent = D(v.rentPerHour ?? 0);

  // Cálculo
  const qty = D(input.qty);
  const materials = D(input.materials);
  const hours = D(input.hours);
  const kwh = D(input.kwh);

  const laborCost = hourlyRate.mul(hours);
  const energyCost = kwhRate.mul(kwh);
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
      materials: n2(materials), hours: n2(hours), kwh: n2(kwh),
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

  // Crear cotización y, si se proporcionó otId, enlazarla a la OT en la misma transacción
  const created = await prisma.$transaction(async (tx) => {
    const cot = await tx.cotizacion.create({
      data: {
        clienteId: input.clienteId,
        currency,
        giPct: gi, marginPct: margin,
        hourlyRate, kwhRate, deprPerHour: depr, toolingPerPc: tooling, rentPerHour: rent,

        qty: input.qty,
        materials, hours, kwh,

        costDirect: direct,
        giAmount, subtotal, marginAmount, total, unitPrice,
        breakdown,

        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        notes: input.notes ?? null,
        status: "DRAFT",
      },
      select: { id: true },
    });

    // Si se pidió enlazar a una OT, intentamos actualizarla
    if (input.otId) {
      // Verificamos que la OT exista
      const ot = await tx.ordenTrabajo.findUnique({ where: { id: input.otId }, select: { id: true, cotizacionId: true } });
      if (!ot) throw new Error("OT no encontrada");
      // Nota: permitimos sobreescribir cotizacionId existente. Si quieres forbidirlo, descomenta siguiente línea
      // if (ot.cotizacionId) throw new Error("La OT ya está enlazada a otra cotización");
      await tx.ordenTrabajo.update({ where: { id: input.otId }, data: { cotizacionId: cot.id } });
    }

    return cot;
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
  const forceMaterialsFlag = String(fd.get("forceMaterials") || "").toLowerCase() === "true";
  const aggregatedMaterials = forceMaterialsFlag
    ? Number(fd.get("materials") || 0)
    : (materialesLines.length ? materialesLines.reduce((s,m)=> s + (m.qty * m.unitCost), 0) : Number(fd.get("materials") || 0));

  const parsed = InputSchema.safeParse({
    clienteId: fd.get("clienteId"),
    qty: aggregatedQty,
    materials: aggregatedMaterials,
    hours: fd.get("hours"),
    kwh: fd.get("kwh") ?? 0,
    validUntil: fd.get("validUntil") || undefined,
    notes: fd.get("notes") || undefined,
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
    const hourlyRate = D(v.hourlyRate ?? 0);
    const kwhRate = D(v.kwhRate ?? 0);
    const depr = D(v.deprPerHour ?? 0);
    const tooling = D(v.toolingPerPiece ?? 0);
    const rent = D(v.rentPerHour ?? 0);

    // Recalcular con los nuevos valores
    const qty = D(input.qty);
    const materials = D(input.materials);
    const hours = D(input.hours);
    const kwh = D(input.kwh);

    const laborCost = hourlyRate.mul(hours);
    const energyCost = kwhRate.mul(kwh);
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
        materials: n2(materials), hours: n2(hours), kwh: n2(kwh),
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

    // Actualizar cotización y manejar posible enlace/desenlace a OT en una transacción
    await prisma.$transaction(async (tx) => {
      await tx.cotizacion.update({
        where: { id: quoteId },
        data: {
          clienteId: input.clienteId,
          currency,
          giPct: gi, marginPct: margin,
          hourlyRate, kwhRate, deprPerHour: depr, toolingPerPc: tooling, rentPerHour: rent,

          qty: input.qty,
          materials, hours, kwh,

          costDirect: direct,
          giAmount, subtotal, marginAmount, total, unitPrice,
          breakdown,

          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        },
      });

      // Si se envia otId, manejamos el enlace: 1) deshacer enlace previo (si existe), 2) enlazar nueva OT
  const newOtId = input.otId as string | undefined;
      if (newOtId !== undefined) {
        // Obtener OT actualmente enlazada a esta cotización (si la hay)
        const prev = await tx.ordenTrabajo.findFirst({ where: { cotizacionId: quoteId }, select: { id: true } });
        if (prev && prev.id !== newOtId) {
          // Desvincular OT previa
          await tx.ordenTrabajo.update({ where: { id: prev.id }, data: { cotizacionId: null } });
        }

        if (newOtId) {
          const ot = await tx.ordenTrabajo.findUnique({ where: { id: newOtId }, select: { id: true, cotizacionId: true } });
          if (!ot) throw new Error("OT no encontrada");
          // Enlazar la OT nueva (puede sobreescribir su cotizacionId actual)
          await tx.ordenTrabajo.update({ where: { id: newOtId }, data: { cotizacionId: quoteId } });
        }
      }
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
