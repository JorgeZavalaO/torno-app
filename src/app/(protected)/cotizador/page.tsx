import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getQuotesCached } from "@/app/server/queries/quotes";
import { getCostingValues } from "@/app/server/queries/costing-params";
import { prisma } from "@/app/lib/prisma";
import { createQuote } from "./actions";
import QuotesClient from "./quotes.client";

export default async function QuotesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "quotes.read"),
    userHasPermission(me.email, "quotes.write"),
  ]);
  if (!canRead) redirect("/");

  const [quotes, clients, params] = await Promise.all([
    getQuotesCached(),
    prisma.cliente.findMany({ 
      where: { activo: true }, 
      orderBy: { nombre: "asc" }, 
      select: { id: true, nombre: true, ruc: true } 
    }),
    getCostingValues(),
  ]);

  // Traer OTs para permitir enlazar cotizaciones (solo id y código)
  const ots = await prisma.ordenTrabajo.findMany({ select: { id: true, codigo: true }, orderBy: { creadaEn: 'desc' } });

  // Mapear a tipos serializables para el cliente (Date -> string, Decimal -> number)
  const items = quotes.map((q) => ({
    id: q.id,
    createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : String(q.createdAt),
    status: q.status,
    currency: q.currency,
    qty: q.qty,
    total: Number(q.total as unknown as number),
    unitPrice: Number(q.unitPrice as unknown as number),
    cliente: q.cliente,
  }));

  return (
    <QuotesClient 
      initialItems={items} 
      canWrite={canWrite} 
      clients={clients}
      params={params}
  action={createQuote}
  ots={ots}
    />
  );
}
