"use server";

import { prisma } from "@/app/lib/prisma";
import { CATEGORY_PREFIX } from "@/lib/product-categories";

/**
 * Genera un SKU único basado en la categoría y un contador
 * Format: [CAT]-[COUNTER] ej: MP-001, HC-042
 */
export async function generateSKU(categoria: string): Promise<string> {
  const prefixMap: Record<string, string> = {
    ...CATEGORY_PREFIX,
  };

  const prefix = prefixMap[categoria] || "XX";
  const build = (n: number) => `${prefix}-${n.toString().padStart(3, "0")}`;

  // Busca el último SKU existente por prefijo ordenado desc y suma 1
  // Evita count + bucle de comprobaciones, reduciendo I/O
  const last = await prisma.producto.findFirst({
    where: { sku: { startsWith: `${prefix}-` } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  const next = last ? (parseInt(last.sku.slice(prefix.length + 1), 10) + 1) : 1;
  return build(next);
}
