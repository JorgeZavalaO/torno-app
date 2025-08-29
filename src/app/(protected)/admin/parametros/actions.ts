"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanReadCosting, assertCanWriteCosting } from "@/app/lib/guards";
import { Prisma } from "@prisma/client";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const UpdateSchema = z.object({
  key: z.string().min(2),
  type: z.enum(["NUMBER", "PERCENT", "CURRENCY", "TEXT"]),
  value: z.union([z.string(), z.number()]).optional().nullable(),
});

const BulkSchema = z.object({
  items: z.array(UpdateSchema),
});

function bump() {
  revalidateTag(cacheTags.costing);
  revalidatePath("/admin/parametros", "page");
}

export async function pingCosting(): Promise<void> {
  await assertCanReadCosting();
}

export async function updateOne(fd: FormData): Promise<Result> {
  try {
    await assertCanWriteCosting();

    const parsed = UpdateSchema.safeParse({
      key: fd.get("key"),
      type: fd.get("type"),
      value: fd.get("value"),
    });
    
    if (!parsed.success) {
      return { ok: false, message: "Los datos proporcionados no son válidos" };
    }

  const { key, type, value } = parsed.data;

    // Validaciones específicas por tipo
    if (type === "PERCENT" && (Number(value ?? 0) < 0 || Number(value ?? 0) > 100)) {
      return { ok: false, message: "El porcentaje debe estar entre 0 y 100" };
    }

    if ((type === "CURRENCY" || type === "NUMBER") && Number(value ?? 0) < 0) {
      return { ok: false, message: "El valor no puede ser negativo" };
    }

    const data =
      type === "TEXT"
        ? { valueText: String(value ?? ""), valueNumber: null }
        : type === "PERCENT"
          ? { valueNumber: new Prisma.Decimal(Number(value ?? 0) / 100), valueText: null }
          : { valueNumber: new Prisma.Decimal(Number(value ?? 0)), valueText: null };

    // Si estamos actualizando la moneda base (currency), debemos convertir
    // los parámetros tipo CURRENCY entre PEN <-> USD utilizando usdRate.
    if (key === "currency") {
      const newCurrency = String(value ?? "PEN").toUpperCase();
      // Obtener usdRate actual
      const rateParam = await prisma.costingParam.findUnique({ where: { key: "usdRate" }, select: { valueNumber: true } });
      const usdRate = rateParam?.valueNumber ? Number(rateParam.valueNumber.toString()) : 3.5;

      // Si cambiamos a USD, convertimos valores CURRENCY almacenados (que asumimos en PEN) a USD = PEN / usdRate
      // Si cambiamos a PEN, convertimos valores que estaban en USD a PEN = USD * usdRate
      const currentCurrencyParam = await prisma.costingParam.findUnique({ where: { key: "currency" }, select: { valueText: true } });
      const currentCurrency = (currentCurrencyParam?.valueText ?? "PEN").toUpperCase();

      if (currentCurrency !== newCurrency) {
        const toUSD = newCurrency === "USD" && currentCurrency === "PEN";
        const toPEN = newCurrency === "PEN" && currentCurrency === "USD";
        if (toUSD || toPEN) {
          const currencyParams = await prisma.costingParam.findMany({ where: { type: "CURRENCY" }, select: { id: true, key: true, valueNumber: true } });
          const txOps = currencyParams.map(p => {
            const val = p.valueNumber ? Number(p.valueNumber.toString()) : 0;
            const newVal = toUSD ? (val / usdRate) : (val * usdRate);
            return prisma.costingParam.update({ where: { key: p.key }, data: { valueNumber: new Prisma.Decimal(newVal) } });
          });
          // Ejecutar la conversión en transacción junto con la actualización del parámetro currency
          await prisma.$transaction([ prisma.costingParam.update({ where: { key }, data }), ...txOps ]);
          bump();
          return { ok: true, message: `Moneda cambiada a ${newCurrency}` };
        }
      }
    }

    await prisma.costingParam.update({ where: { key }, data });
    bump();
    return { ok: true, message: "Parámetro actualizado correctamente" };
  } catch (error) {
    console.error("Error updating parameter:", error);
    return { ok: false, message: "Error interno del servidor. Inténtalo de nuevo." };
  }
}

export async function bulkUpdate(fd: FormData): Promise<Result> {
  try {
    await assertCanWriteCosting();

    const raw = fd.get("payload") as string | null;
    if (!raw) return { ok: false, message: "Datos faltantes en la solicitud" };

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(raw);
    } catch {
      return { ok: false, message: "Formato de datos inválido" };
    }

    const parsed = BulkSchema.safeParse(parsedPayload);
    if (!parsed.success) {
      return { ok: false, message: "Los datos no tienen el formato correcto" };
    }

    // Validaciones antes de la transacción
    for (const item of parsed.data.items) {
      if (item.type === "PERCENT" && (Number(item.value ?? 0) < 0 || Number(item.value ?? 0) > 100)) {
        return { ok: false, message: `El porcentaje para ${item.key} debe estar entre 0 y 100` };
      }
      if ((item.type === "CURRENCY" || item.type === "NUMBER") && Number(item.value ?? 0) < 0) {
        return { ok: false, message: `El valor para ${item.key} no puede ser negativo` };
      }
    }

    const tx = parsed.data.items.map(({ key, type, value }) => {
      const data =
        type === "TEXT"
          ? { valueText: String(value ?? ""), valueNumber: null }
          : type === "PERCENT"
            ? { valueNumber: new Prisma.Decimal(Number(value ?? 0) / 100), valueText: null }
            : { valueNumber: new Prisma.Decimal(Number(value ?? 0)), valueText: null };
      return prisma.costingParam.update({ where: { key }, data });
    });

    await prisma.$transaction(tx);
    bump();
    return { ok: true, message: `${parsed.data.items.length} parámetros guardados correctamente` };
  } catch (error) {
    console.error("Error in bulk update:", error);
    return { ok: false, message: "Error al guardar los parámetros. Inténtalo de nuevo." };
  }
}

export async function resetDefaults(): Promise<Result> {
  try {
    await assertCanWriteCosting();
    
    const defaults: Record<string, { type: "TEXT"|"PERCENT"|"CURRENCY"|"NUMBER"; v: number | string }> = {
      currency:        { type: "TEXT",     v: "PEN" },
  usdRate:         { type: "NUMBER",   v: 3.5 },
      gi:              { type: "PERCENT",  v: 15 },
      margin:          { type: "PERCENT",  v: 20 },
      hourlyRate:      { type: "CURRENCY", v: 75 },
      kwhRate:         { type: "CURRENCY", v: 0.9 },
      deprPerHour:     { type: "CURRENCY", v: 8 },
      toolingPerPiece: { type: "CURRENCY", v: 2.5 },
      rentPerHour:     { type: "CURRENCY", v: 10 },
    };

    const tx = Object.entries(defaults).map(([key, def]) => {
      const data = def.type === "TEXT"
        ? { valueText: String(def.v), valueNumber: null }
        : { valueNumber: new Prisma.Decimal(Number(def.v) / (def.type === "PERCENT" ? 100 : 1)), valueText: null };
      return prisma.costingParam.update({ where: { key }, data });
    });

    await prisma.$transaction(tx);
    bump();
    return { ok: true, message: "Valores restablecidos a los predeterminados" };
  } catch (error) {
    console.error("Error resetting defaults:", error);
    return { ok: false, message: "Error al restablecer los valores predeterminados" };
  }
}