// Utilidades para generación de SKU - función pura sin "use server"
// Puede ser importada tanto desde cliente como servidor

import { CATEGORY_PREFIX } from "@/lib/product-categories";

/**
 * Obtiene el prefijo de categoría para SKU
 */
export function getCategoryPrefix(categoria: string): string {
  const prefixMap: Record<string, string> = {
    ...CATEGORY_PREFIX,
  };
  return prefixMap[categoria] || "XX";
}

/**
 * Construye un SKU con el prefijo y número
 */
export function buildSKU(prefix: string, number: number): string {
  return `${prefix}-${number.toString().padStart(3, "0")}`;
}
