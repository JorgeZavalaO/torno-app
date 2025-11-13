"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Client, QuoteData } from "./types";
import { formatCurrency } from "@/app/lib/format";

interface QuotesModalProps {
  state: { open: boolean; client?: Client | null };
  onOpenChange: (open: boolean) => void;
  quotes: QuoteData[];
  loading: boolean;
  systemCurrency?: string;
}

export default function QuotesModal({
  state,
  onOpenChange,
  quotes,
  loading,
  systemCurrency = "PEN",
}: QuotesModalProps) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Cotizaciones de {state.client?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Cargando cotizaciones...
              </div>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                No hay cotizaciones registradas para este cliente
              </div>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono text-xs">
                        <a
                          className="underline hover:no-underline"
                          href={`/cotizador/${quote.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {quote.codigo || `#${quote.id.slice(0, 8)}`}
                        </a>
                      </TableCell>
                      <TableCell>
                        {new Date(quote.createdAt).toLocaleDateString("es-PE")}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{quote.status}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(quote.total, quote.currency ?? systemCurrency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}