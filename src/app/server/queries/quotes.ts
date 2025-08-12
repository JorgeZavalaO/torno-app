import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

export const getQuotesCached = cache(
  async () =>
    prisma.cotizacion.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, createdAt: true, status: true, currency: true,
        qty: true, total: true, unitPrice: true,
        cliente: { select: { id: true, nombre: true, ruc: true } },
      },
    }),
  ["quotes:list"],
  { tags: [cacheTags.quotes] }
);

export async function getQuoteById(id: string) {
  const q = await prisma.cotizacion.findUnique({
    where: { id },
    include: { cliente: { select: { id: true, nombre: true, ruc: true, email: true } } },
  });
  if (!q) return null;

  const hasToString = (x: unknown): x is { toString: () => string } =>
    typeof (x as { toString?: unknown })?.toString === "function";
  const toNum = (v: unknown) => (v == null ? 0 : Number(hasToString(v) ? v.toString() : (v as unknown as number)));

  // Devolver objeto plano sin Prisma.Decimal
  return {
    id: q.id,
    clienteId: q.clienteId,
    solicitudId: q.solicitudId ?? undefined,
    version: q.version,
    currency: q.currency,
    giPct: toNum(q.giPct),
    marginPct: toNum(q.marginPct),
    hourlyRate: toNum(q.hourlyRate),
    kwhRate: toNum(q.kwhRate),
    deprPerHour: toNum(q.deprPerHour),
    toolingPerPc: toNum(q.toolingPerPc),
    rentPerHour: toNum(q.rentPerHour),

    qty: q.qty,
    materials: toNum(q.materials),
    hours: toNum(q.hours),
    kwh: toNum(q.kwh),

    // Totales (por si algún componente los usa)
    costDirect: toNum(q.costDirect),
    giAmount: toNum(q.giAmount),
    subtotal: toNum(q.subtotal),
    marginAmount: toNum(q.marginAmount),
    total: toNum(q.total),
    unitPrice: toNum(q.unitPrice),
    breakdown: q.breakdown,

    status: q.status,
    validUntil: q.validUntil ?? null,
    notes: q.notes ?? null,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,

    cliente: {
      id: q.cliente.id,
      nombre: q.cliente.nombre,
      ruc: q.cliente.ruc,
      email: q.cliente.email ?? null,
    },
  };
}
