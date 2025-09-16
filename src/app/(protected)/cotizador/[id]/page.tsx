import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getQuoteById } from "@/app/server/queries/quotes";
import { QuoteDetailView } from "@/components/cotizador/quote-detail-view";

export default async function QuoteDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "quotes.read"),
    userHasPermission(me.email, "quotes.write"),
  ]);
  if (!canRead) redirect("/");

  const quote = await getQuoteById(id);
  if (!quote) redirect("/cotizador");

  // Sanitizar: convertir Prisma.Decimal a number y asegurar objetos planos
  const toNum = (v: unknown) => (v == null ? 0 : Number(v?.toString?.() ?? v));
  const plainQuote = {
    id: quote.id,
    createdAt: quote.createdAt,
    status: quote.status,
    currency: quote.currency,
    qty: quote.qty,
    materials: toNum(quote.materials),
    hours: toNum(quote.hours),
    kwh: toNum(quote.kwh),
    validUntil: quote.validUntil ?? null,
    notes: quote.notes ?? null,
    tipoTrabajoId: quote.tipoTrabajoId ?? null,
    tipoTrabajo: quote.tipoTrabajo ?? null,
    giPct: toNum(quote.giPct),
    marginPct: toNum(quote.marginPct),
    hourlyRate: toNum(quote.hourlyRate),
    kwhRate: toNum(quote.kwhRate),
    deprPerHour: toNum(quote.deprPerHour),
    toolingPerPc: toNum(quote.toolingPerPc),
    rentPerHour: toNum(quote.rentPerHour),
    breakdown: quote.breakdown,
  cliente: {
      id: quote.cliente!.id,
      nombre: quote.cliente!.nombre,
      ruc: quote.cliente!.ruc,
      email: quote.cliente!.email ?? undefined,
    },
  ordenesTrabajo: quote.ordenesTrabajo ?? [],
  };

  return (
    <div className="p-6">
      <QuoteDetailView quote={plainQuote as unknown as {
        id: string;
        createdAt: Date;
        status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
        currency: string;
        qty: number;
        materials: number;
        hours: number;
        kwh: number;
        validUntil?: Date | null;
        notes?: string | null;
        tipoTrabajoId?: string | null;
        tipoTrabajo?: { id: string; nombre: string; descripcion: string | null } | null;
        giPct: number;
        marginPct: number;
        hourlyRate: number;
        kwhRate: number;
        deprPerHour: number;
        toolingPerPc: number;
        rentPerHour: number;
        breakdown: unknown;
        cliente: { id: string; nombre: string; ruc: string; email?: string | null };
        ordenesTrabajo?: { id: string; codigo: string }[];
  }} canWrite={canWrite} />
    </div>
  );
}
