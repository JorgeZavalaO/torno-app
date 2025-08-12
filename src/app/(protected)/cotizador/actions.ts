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

  const parsed = InputSchema.safeParse({
    clienteId: fd.get("clienteId"),
    qty: fd.get("qty"),
    materials: fd.get("materials"),
    hours: fd.get("hours"),
    kwh: fd.get("kwh") ?? 0,
    validUntil: fd.get("validUntil") || undefined,
    notes: fd.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const input = parsed.data;

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

  const created = await prisma.cotizacion.create({
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

  const parsed = InputSchema.safeParse({
    clienteId: fd.get("clienteId"),
    qty: fd.get("qty"),
    materials: fd.get("materials"),
    hours: fd.get("hours"),
    kwh: fd.get("kwh") ?? 0,
    validUntil: fd.get("validUntil") || undefined,
    notes: fd.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const input = parsed.data;

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

    await prisma.cotizacion.update({
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
