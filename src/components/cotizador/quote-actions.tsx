"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Send, Trash2, MoreHorizontal, Copy, FileText } from "lucide-react";
import Link from "next/link";
import { QuoteDeleteDialog } from "./quote-delete-dialog";
import { QuoteStatusDialog } from "./quote-status-dialog";
import { useState } from "react";
import { toast } from "sonner";

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

interface QuoteActionsProps {
  quote: Quote;
  canWrite: boolean;
}

export function QuoteActions({ quote, canWrite }: QuoteActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const copyQuoteId = () => {
    navigator.clipboard.writeText(quote.id);
    toast.success("ID de cotización copiado");
  };

  const generatePDF = () => {
    // Implementar generación de PDF
    toast.info("Funcionalidad de PDF próximamente");
  };

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        {/* Botón ver siempre disponible */}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/cotizador/${quote.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>

        {/* Menú desplegable para más acciones */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={copyQuoteId}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar ID
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={generatePDF}>
              <FileText className="h-4 w-4 mr-2" />
              Generar PDF
            </DropdownMenuItem>

            {canWrite && (
              <>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setStatusDialogOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Cambiar estado
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Diálogos */}
      <QuoteDeleteDialog
        quote={quote}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      <QuoteStatusDialog
        quote={quote}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      />
    </>
  );
}
