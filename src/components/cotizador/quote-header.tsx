"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileBarChart, TrendingUp, Clock } from "lucide-react";
import { NewQuoteDialog } from "./new-quote-dialog";
import { useState } from "react";

type Client = { id: string; nombre: string; ruc: string };
type CostingParams = Record<string, string | number>;
type CreateQuoteAction = (fd: FormData) => Promise<{ ok: boolean; id?: string; message?: string }>;

interface Quote {
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  total: number;
  currency: string;
}

interface QuoteHeaderProps {
  canWrite: boolean;
  clients: Client[];
  params: CostingParams;
  action: CreateQuoteAction;
  quotes: Quote[];
  ots?: { id: string; codigo: string }[];
}

export function QuoteHeader({ 
  canWrite, 
  clients, 
  params, 
  action, 
  quotes 
  , ots
}: QuoteHeaderProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === "DRAFT").length,
    sent: quotes.filter(q => q.status === "SENT").length,
    approved: quotes.filter(q => q.status === "APPROVED").length,
    totalValue: quotes
      .filter(q => q.status === "APPROVED")
      .reduce((sum, q) => sum + q.total, 0),
  };

  const formatCurrency = (amount: number, currency: string = "PEN") =>
    new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <>
      <div className="space-y-6">
        {/* Header principal */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
            <p className="text-muted-foreground">
              Gestiona y crea cotizaciones para tus clientes
            </p>
          </div>
          {canWrite && (
            <Button 
              size="lg"
              onClick={() => setShowNewDialog(true)}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Nueva cotización
            </Button>
          )}
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileBarChart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.draft + stats.sent}</div>
                <div className="text-sm text-muted-foreground">Pendientes</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.approved}</div>
                <div className="text-sm text-muted-foreground">Aprobadas</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileBarChart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalValue)}
                </div>
                <div className="text-sm text-muted-foreground">Valor aprobado</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal para nueva cotización */}
      {canWrite && (
        <NewQuoteDialog
          open={showNewDialog}
          onOpenChange={setShowNewDialog}
          clients={clients}
          params={params}
          action={action}
          ots={ots}
        />
      )}
    </>
  );
}
