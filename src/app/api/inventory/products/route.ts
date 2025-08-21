import { NextResponse } from "next/server";
import { getProductsWithStock } from "@/app/server/queries/inventory";
import { assertCanReadInventory } from "@/app/lib/guards";

export async function GET() {
  try {
    await assertCanReadInventory();
  } catch {
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  const products = await getProductsWithStock();

  // Transform to lightweight options (incluye stock y categoría para filtrado en UI de cotizador)
  const opts = products.map(p => ({ 
    sku: p.sku, 
    nombre: p.nombre, 
    categoria: p.categoria, 
    uom: p.uom, 
    lastCost: p.lastCost, 
    stock: p.stock 
  }));
  return NextResponse.json({ ok: true, products: opts });
}
