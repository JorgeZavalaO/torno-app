import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";
import { serializeQuote } from "./serializers";
import type { PlainQuote } from "./serializers";

export const getQuotesCached = cache(
  async () =>
    prisma.cotizacion.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, codigo: true, createdAt: true, status: true, currency: true,
        qty: true, total: true, unitPrice: true,
        cliente: { select: { id: true, nombre: true, ruc: true } },
      },
    }),
  ["quotes:list"],
  { tags: [cacheTags.quotes] }
);

export async function getQuoteById(id: string): Promise<(PlainQuote & { ordenesTrabajo?: { id: string; codigo: string }[]; tipoTrabajo?: { id: string; nombre: string; descripcion: string | null } | null }) | null> {
  const q = await prisma.cotizacion.findUnique({
    where: { id },
    include: { 
      cliente: { select: { id: true, nombre: true, ruc: true, email: true } },
      tipoTrabajo: { select: { id: true, nombre: true, descripcion: true } },
      ordenesTrabajo: { select: { id: true, codigo: true } }
    },
  });
  if (!q) return null;
  const ser = serializeQuote(q, true);
  // return serialized quote plus related OTs (id + codigo)
  return { ...ser, ordenesTrabajo: q.ordenesTrabajo, tipoTrabajo: q.tipoTrabajo };
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
