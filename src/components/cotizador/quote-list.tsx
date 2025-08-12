"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";
import { QuoteActions } from "./quote-actions";
import { QuoteStatusBadge } from "./quote-status-badge";

type Quote = {
  id: string;
  createdAt: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  currency: string;
  qty: number;
  total: number;
  unitPrice: number;
  cliente: { id: string; nombre: string; ruc: string };
};

interface QuoteListProps {
  quotes: Quote[];
  canWrite: boolean;
}

export function QuoteList({ quotes, canWrite }: QuoteListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return quotes;
    
    return quotes.filter((quote) =>
      quote.cliente.nombre.toLowerCase().includes(query) ||
      quote.cliente.ruc.toLowerCase().includes(query) ||
      quote.id.toLowerCase().includes(query)
    );
  }, [searchQuery, quotes]);

  const formatCurrency = (amount: number | string, currency: string) =>
    new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: currency || "PEN" 
    }).format(Number(amount));

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda mejorada */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, RUC o ID de cotización..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Tabla de cotizaciones */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => (
              <TableRow key={quote.id} className="hover:bg-muted/20">
                <TableCell className="font-mono text-sm">
                  #{quote.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{quote.cliente.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      RUC: {quote.cliente.ruc}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(quote.createdAt)}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {quote.qty}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(quote.unitPrice, quote.currency)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(quote.total, quote.currency)}
                </TableCell>
                <TableCell className="text-center">
                  <QuoteStatusBadge status={quote.status} />
                </TableCell>
                <TableCell className="text-center">
                  <QuoteActions 
                    quote={quote} 
                    canWrite={canWrite} 
                  />
                </TableCell>
              </TableRow>
            ))}
            {filteredQuotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>
                      {searchQuery ? "No se encontraron cotizaciones" : "No hay cotizaciones aún"}
                    </p>
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSearchQuery("")}
                      >
                        Limpiar búsqueda
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
