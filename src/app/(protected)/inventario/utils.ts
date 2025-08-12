"use server";

import { prisma } from "@/app/lib/prisma";

/**
 * Genera un SKU único basado en la categoría y un contador
 * Format: [CAT]-[COUNTER] ej: MP-001, HC-042
 */
export async function generateSKU(categoria: string): Promise<string> {
  // Mapa de prefijos para cada categoría
  const prefixMap: Record<string, string> = {
    "MATERIA_PRIMA": "MP",
    "HERRAMIENTA_CORTE": "HC",
    "CONSUMIBLE": "CO",
    "REPUESTO": "RP"
  };
  
  // Obtener el prefijo según la categoría
  const prefix = prefixMap[categoria] || "XX";
  
  // Contar productos existentes con este prefijo para determinar el siguiente número
  const count = await prisma.producto.count({
    where: { sku: { startsWith: prefix } }
  });
  
  // Generar el SKU con formato [PREFIX]-[000]
  const counter = (count + 1).toString().padStart(3, '0');
  const sku = `${prefix}-${counter}`;
  
  // Verificar si existe (por si acaso) y regenerar si es necesario
  const exists = await prisma.producto.findUnique({ where: { sku } });
  if (exists) {
    // Buscar manualmente el siguiente disponible
    let i = count + 2;
    while (true) {
      const testSku = `${prefix}-${i.toString().padStart(3, '0')}`;
      const testExists = await prisma.producto.findUnique({ where: { sku: testSku } });
      if (!testExists) return testSku;
      i++;
    }
  }
  
  return sku;
}

// Lista de unidades de medida disponibles
export const unidadesMedida = [
  // Unidades básicas
  { value: "pz", label: "Pieza" },
  { value: "und", label: "Unidad" },
  { value: "par", label: "Par" },
  { value: "caja", label: "Caja" },
  // Longitud
  { value: "mm", label: "Milímetro" },
  { value: "cm", label: "Centímetro" },
  { value: "m", label: "Metro" },
  { value: "pulg", label: "Pulgada" },
  { value: "ft", label: "Pie" },
  // Peso
  { value: "g", label: "Gramo" },
  { value: "kg", label: "Kilogramo" },
  { value: "ton", label: "Tonelada" },
  { value: "lb", label: "Libra" },
  // Volumen
  { value: "ml", label: "Mililitro" },
  { value: "l", label: "Litro" },
  { value: "gal", label: "Galón" },
  // Área
  { value: "m2", label: "Metro cuadrado" },
  { value: "cm2", label: "Centímetro cuadrado" },
  // Paquetes
  { value: "pack", label: "Paquete" },
  { value: "set", label: "Set" },
  { value: "lote", label: "Lote" },
  // Tiempo
  { value: "hora", label: "Hora" },
  { value: "día", label: "Día" },
];
