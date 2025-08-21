"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  User, 
  Hash, 
  DollarSign, 
  Package,
  Clock,
  Zap,
  Settings,
  Wrench,
  Home,
  CheckCircle,
  XCircle
} from "lucide-react";
import { QuoteStatusBadge } from "@/components/cotizador/quote-status-badge";
import { toast } from "sonner";
import { updateQuoteStatus, createOTFromQuote } from "@/app/(protected)/cotizador/actions";

type QuoteDetail = {
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
  pedidoReferencia?: string | null;
  giPct: number;
  marginPct: number;
  hourlyRate: number;
  kwhRate: number;
  deprPerHour: number;
  toolingPerPc: number;
  rentPerHour: number;
  breakdown: unknown;
  cliente: {
    id: string;
    nombre: string;
    ruc: string;
    email?: string | null;
  };
  ordenesTrabajo?: { id: string; codigo: string }[];
};

interface QuoteDetailViewProps {
  quote: QuoteDetail;
  canWrite: boolean;
}

export function QuoteDetailView({ quote, canWrite }: QuoteDetailViewProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleQuickStatusChange = (newStatus: "APPROVED" | "REJECTED") => {
    if (!canWrite) return;

    const message = newStatus === "APPROVED" 
      ? "¿Aprobar esta cotización?" 
      : "¿Rechazar esta cotización?";

    if (confirm(message)) {
      startTransition(async () => {
        const result = await updateQuoteStatus(
          quote.id, 
          newStatus, 
          newStatus === "REJECTED" ? "Rechazada desde vista de detalle" : undefined
        );
        
        if (result.ok) {
          toast.success(result.message || "Estado actualizado correctamente");
          router.refresh();
          window.location.reload();
        } else {
          toast.error(result.message || "Error al actualizar el estado");
        }
      });
    }
  };
  // Función helper para convertir valores
  const toNum = (v: unknown): number => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") return Number(v) || 0;
    const hasToNumber = (x: unknown): x is { toNumber: () => number } =>
      typeof (x as { toNumber?: unknown })?.toNumber === "function";
    const hasToString = (x: unknown): x is { toString: () => string } =>
      typeof (x as { toString?: unknown })?.toString === "function";
    if (hasToNumber(v)) return v.toNumber();
    if (hasToString(v)) return Number(v.toString()) || 0;
    return Number(v) || 0;
  };

  const formatCurrency = (n: unknown) =>
    new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: quote.currency || "PEN" 
    }).format(toNum(n));

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);

  type Breakdown = {
    costs?: {
      materials?: unknown;
      labor?: unknown;
      energy?: unknown;
      depreciation?: unknown;
      tooling?: unknown;
      rent?: unknown;
      direct?: unknown;
      giAmount?: unknown;
      subtotal?: unknown;
      marginAmount?: unknown;
      total?: unknown;
      unitPrice?: unknown;
    };
  };
  
  const breakdown = (quote.breakdown as unknown as Breakdown) || {};
  const costs = breakdown.costs || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Cotización #{quote.id.slice(0, 8)}</h1>
          {quote.ordenesTrabajo && quote.ordenesTrabajo.length > 0 && (
            <div className="text-sm text-muted-foreground">
              OT vinculada: <a className="underline" href={`/ot/${quote.ordenesTrabajo[0].id}`}>{quote.ordenesTrabajo[0].codigo}</a>
            </div>
          )}
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(quote.createdAt)}</span>
            </div>
            {quote.validUntil && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Válida hasta: {formatDate(quote.validUntil)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <QuoteStatusBadge status={quote.status} />
          {canWrite && (
            <div className="flex gap-2">
              {quote.status !== "APPROVED" && quote.status !== "REJECTED" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickStatusChange("APPROVED")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    disabled={pending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {pending ? "Aprobando..." : "Aprobar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickStatusChange("REJECTED")}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={pending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {pending ? "Rechazando..." : "Rechazar"}
                  </Button>
                </>
              )}
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generar PDF
              </Button>
              {quote.status === 'APPROVED' && (quote.ordenesTrabajo?.length ?? 0) === 0 && (
                <Button
                  variant="default"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('Generar una Orden de Trabajo desde esta cotización aprobada?')) return;
                    startTransition(async () => {
                      const r = await createOTFromQuote(quote.id);
                      if (r.ok) {
                        toast.success(r.message || 'OT creada');
                        router.refresh();
                        window.location.href = `/ot/${r.id}`;
                      } else {
                        toast.error(r.message);
                      }
                    });
                  }}
                >
                  {pending ? 'Creando OT...' : 'Generar OT'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Información del cliente */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold">{quote.cliente.nombre}</h2>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <span>RUC: {quote.cliente.ruc}</span>
              </div>
              {quote.cliente.email && (
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <span>{quote.cliente.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desglose de costos */}
        <Card className="p-6 lg:col-span-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Desglose de costos</h2>
            
            {/* Parámetros de entrada */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Cantidad</span>
                </div>
                <div className="text-2xl font-bold">{quote.qty}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Materiales</span>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(quote.materials)}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Horas</span>
                </div>
                <div className="text-lg font-semibold">{toNum(quote.hours)}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">kWh</span>
                </div>
                <div className="text-lg font-semibold">{toNum(quote.kwh)}</div>
              </div>
            </div>

            <Separator />

            {/* Costos detallados */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    Materiales
                  </span>
                  <span className="font-medium">{formatCurrency(costs.materials ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-500" />
                    Mano de obra
                  </span>
                  <span className="font-medium">{formatCurrency(costs.labor ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Energía
                  </span>
                  <span className="font-medium">{formatCurrency(costs.energy ?? 0)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-500" />
                    Depreciación
                  </span>
                  <span className="font-medium">{formatCurrency(costs.depreciation ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    Herramientas
                  </span>
                  <span className="font-medium">{formatCurrency(costs.tooling ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-purple-500" />
                    Alquiler
                  </span>
                  <span className="font-medium">{formatCurrency(costs.rent ?? 0)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Totales */}
            <div className="space-y-2">
              <div className="flex justify-between text-base font-medium">
                <span>Costo directo</span>
                <span>{formatCurrency(costs.direct ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gastos indirectos ({(toNum(quote.giPct) * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(costs.giAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(costs.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Margen ({(toNum(quote.marginPct) * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(costs.marginAmount ?? 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(costs.total ?? 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Precio unitario</span>
                <span>{formatCurrency(costs.unitPrice ?? 0)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Panel lateral con parámetros */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Parámetros utilizados
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Gastos indirectos</span>
                  <span className="font-medium">{(toNum(quote.giPct) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Margen</span>
                  <span className="font-medium">{(toNum(quote.marginPct) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarifa por hora</span>
                  <span className="font-medium">{formatCurrency(quote.hourlyRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarifa kWh</span>
                  <span className="font-medium">{formatCurrency(quote.kwhRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Depreciación/hora</span>
                  <span className="font-medium">{formatCurrency(quote.deprPerHour)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Herramientas/pieza</span>
                  <span className="font-medium">{formatCurrency(quote.toolingPerPc)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alquiler/hora</span>
                  <span className="font-medium">{formatCurrency(quote.rentPerHour)}</span>
                </div>
              </div>
            </div>
          </Card>

          {quote.pedidoReferencia && (
            <Card className="p-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Pedido de Referencia
                </h3>
                <p className="text-sm font-mono bg-muted/50 px-3 py-2 rounded border">
                  {quote.pedidoReferencia}
                </p>
              </div>
            </Card>
          )}

          {quote.notes && (
            <Card className="p-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Observaciones
                </h3>
                <p className="text-sm">{quote.notes}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
