import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getQuotesCached } from "@/app/server/queries/quotes";
import { getCostingValues } from "@/app/server/queries/costing-params";
import { getMachineCostingCategories } from "@/app/server/queries/machine-costing-categories";
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

  const [quotes, clients, params, machineCategories] = await Promise.all([
    getQuotesCached(),
    prisma.cliente.findMany({ 
      where: { activo: true }, 
      orderBy: { nombre: "asc" }, 
      select: { id: true, nombre: true, ruc: true } 
    }),
    getCostingValues(),
    getMachineCostingCategories(),
  ]);

  // Mapear a tipos serializables para el cliente (Date -> string, Decimal -> number)
  const items = quotes.map((q: {
    id: string;
    codigo?: string | null;
    createdAt: Date | string;
    status: string;
    currency: string;
    qty: number;
    total: unknown;
    unitPrice: unknown;
    cliente: { id: string; nombre: string; ruc: string };
  }) => ({
    id: q.id,
    codigo: q.codigo ?? null,
    createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : String(q.createdAt),
    status: q.status as "APPROVED" | "REJECTED" | "DRAFT" | "SENT",
    currency: q.currency,
    qty: q.qty,
    total: Number(q.total as unknown as number),
    unitPrice: Number(q.unitPrice as unknown as number),
    cliente: q.cliente,
  }));

  // Serializar categorías
  const serializedCategories = machineCategories.map(cat => ({
    id: cat.id,
    categoria: cat.categoria,
    laborCost: Number(cat.laborCost.toString()),
    deprPerHour: Number(cat.deprPerHour.toString()),
  }));

  return (
    <QuotesClient 
      initialItems={items} 
      canWrite={canWrite} 
      clients={clients}
      params={params}
      machineCategories={serializedCategories}
      action={createQuote}
    />
  );
}
