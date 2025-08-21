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

  const count = await prisma.producto.count({ where: { sku: { startsWith: prefix } } });

  const build = (n: number) => `${prefix}-${n.toString().padStart(3, "0")}`;
  let candidate = build(count + 1);

  // Garantizar unicidad en caso de huecos (rara vez necesario, pero seguro)
  while (true) {
    const exists = await prisma.producto.findUnique({ where: { sku: candidate } });
    if (!exists) return candidate;
    candidate = build(parseInt(candidate.slice(prefix.length + 1)) + 1);
  }
}
