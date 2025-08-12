import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";
import { serializeQuote } from "./serializers";

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
  return serializeQuote(q, true);
}

export async function getQuotesByClientIdPlain(clientId: string, limit = 50) {
  const rows = await prisma.cotizacion.findMany({
    where: { clienteId: clientId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { cliente: { select: { id: true, nombre: true, ruc: true, email: true } } },
  });
  return rows.map((q) => serializeQuote(q, true));
}
