import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertCanReadInventory } from "@/app/lib/guards";

// Devuelve stock disponible (suma de movimientos) y último costo de ingreso para un SKU
export async function GET(req: NextRequest) {
  try {
    await assertCanReadInventory();
  } catch {
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sku = decodeURIComponent(parts[parts.length - 1] || '');
  if (!sku) return NextResponse.json({ ok: false, message: 'SKU requerido' }, { status: 400 });
  const [sum, lastIn] = await Promise.all([
    prisma.movimiento.groupBy({
      by: ['productoId'],
      where: { productoId: sku },
      _sum: { cantidad: true }
    }),
    prisma.movimiento.findFirst({
      where: { productoId: sku, tipo: { in: ['INGRESO_COMPRA','INGRESO_AJUSTE'] } },
      orderBy: { fecha: 'desc' },
      select: { costoUnitario: true }
    })
  ]);
  const stock = sum.length ? Number(sum[0]._sum.cantidad?.toString?.() ?? 0) : 0;
  const lastCost = lastIn ? Number(lastIn.costoUnitario?.toString?.() ?? 0) : 0;
  return NextResponse.json({ ok: true, sku, stock, lastCost });
}
