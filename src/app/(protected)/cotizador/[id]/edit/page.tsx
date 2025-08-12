import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getQuoteById } from "@/app/server/queries/quotes";
import { getCostingValues } from "@/app/server/queries/costing-params";
import { prisma } from "@/app/lib/prisma";
import { EditQuoteClient } from "@/components/cotizador/edit-quote-client";
import { updateQuote } from "../../actions";

export default async function EditQuotePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "quotes.read"),
    userHasPermission(me.email, "quotes.write"),
  ]);
  
  if (!canRead) redirect("/");
  if (!canWrite) redirect(`/cotizador/${id}`);

  const [quote, clients, params2] = await Promise.all([
    getQuoteById(id),
    prisma.cliente.findMany({ 
      where: { activo: true }, 
      orderBy: { nombre: "asc" }, 
      select: { id: true, nombre: true, ruc: true } 
    }),
    getCostingValues(),
  ]);

  if (!quote) redirect("/cotizador");

  // No permitir editar cotizaciones aprobadas
  if (quote.status === "APPROVED") {
  redirect(`/cotizador/${id}`);
  }

  // Sanitizar: convertir Prisma.Decimal a number y asegurar objeto plano
  const toNum = (v: unknown) => (v == null ? 0 : Number(v?.toString?.() ?? v));
  const plainQuote = {
    id: quote.id,
    createdAt: quote.createdAt,
    status: quote.status,
    currency: quote.currency,
    clienteId: quote.clienteId,
    qty: quote.qty,
    materials: toNum(quote.materials),
    hours: toNum(quote.hours),
    kwh: toNum(quote.kwh),
    validUntil: quote.validUntil ?? null,
    notes: quote.notes ?? null,
    cliente: {
      id: quote.cliente!.id,
      nombre: quote.cliente!.nombre,
      ruc: quote.cliente!.ruc,
    },
  };

  return (
    <div className="p-6">
      <EditQuoteClient 
        quote={plainQuote as unknown as {
          id: string;
          createdAt: Date;
          status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
          currency: string;
          clienteId: string;
          qty: number;
          materials: unknown;
          hours: unknown;
          kwh: unknown;
          validUntil?: Date | null;
          notes?: string | null;
          cliente: { id: string; nombre: string; ruc: string };
        }}
        clients={clients}
        params={params2}
        action={updateQuote}
      />
    </div>
  );
}
