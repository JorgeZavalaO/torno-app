import { NextResponse, NextRequest } from "next/server";
import { getProductsWithStock, getProductsWithStockUncached } from "@/app/server/queries/inventory";
import { assertCanReadInventory } from "@/app/lib/guards";

export async function GET(req: NextRequest) {
  try {
    await assertCanReadInventory();
  } catch {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? undefined;

  const products = q
    ? await getProductsWithStockUncached(q)
    : await getProductsWithStock();

  const opts = products.map((p) => ({
    sku: p.sku,
    nombre: p.nombre,
    categoria: p.categoria,
    uom: p.uom,
    lastCost: p.lastCost,
    refCost: p.refCost,
    stock: p.stock,
  }));

  return NextResponse.json({ ok: true, products: opts });
}
