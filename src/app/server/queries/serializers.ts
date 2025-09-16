export type PlainQuote = {
  id: string;
  clienteId: string;
  version: number;
  currency: string;
  giPct: number;
  marginPct: number;
  hourlyRate: number;
  kwhRate: number;
  deprPerHour: number;
  toolingPerPc: number;
  rentPerHour: number;
  qty: number;
  materials: number;
  hours: number;
  kwh: number;
  costDirect: number;
  giAmount: number;
  subtotal: number;
  marginAmount: number;
  total: number;
  unitPrice: number;
  breakdown: unknown;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  validUntil: Date | null;
  notes: string | null;
  pedidoReferencia: string | null;
  tipoTrabajoId: string | null;
  createdAt: Date;
  updatedAt: Date;
  cliente?: { id: string; nombre: string; ruc: string; email?: string | null };
};

const hasToString = (x: unknown): x is { toString: () => string } =>
  typeof (x as { toString?: unknown })?.toString === "function";
export const toNum = (v: unknown) => (v == null ? 0 : Number(hasToString(v) ? v.toString() : (v as number)));

type PrismaLikeQuote = {
  id: string;
  clienteId: string;
  version: number;
  currency: string;
  giPct: unknown; marginPct: unknown; hourlyRate: unknown; kwhRate: unknown;
  deprPerHour: unknown; toolingPerPc: unknown; rentPerHour: unknown;
  qty: number; materials: unknown; hours: unknown; kwh: unknown;
  costDirect: unknown; giAmount: unknown; subtotal: unknown; marginAmount: unknown; total: unknown; unitPrice: unknown;
  breakdown: unknown;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  validUntil: Date | null; notes: string | null; pedidoReferencia: string | null;
  tipoTrabajoId: string | null;
  createdAt: Date; updatedAt: Date;
  cliente?: { id: string; nombre: string; ruc: string; email?: string | null };
};

export function serializeQuote(q: PrismaLikeQuote, withClient = true): PlainQuote {
  return {
    id: q.id,
    clienteId: q.clienteId,
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
    pedidoReferencia: q.pedidoReferencia ?? null,
    tipoTrabajoId: q.tipoTrabajoId ?? null,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    cliente: withClient && q.cliente
      ? { id: q.cliente.id, nombre: q.cliente.nombre, ruc: q.cliente.ruc, email: q.cliente.email ?? null }
      : undefined,
  };
}
