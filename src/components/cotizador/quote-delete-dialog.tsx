"use client";

import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteQuote } from "@/app/(protected)/cotizador/actions";

type Quote = {
  id: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  cliente: { nombre: string };
};

interface QuoteDeleteDialogProps {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteDeleteDialog({ quote, open, onOpenChange }: QuoteDeleteDialogProps) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteQuote(quote.id);
      
      if (result.ok) {
        toast.success(result.message || "Cotización eliminada correctamente");
        onOpenChange(false);
        window.location.reload();
      } else {
        toast.error(result.message || "Error al eliminar la cotización");
      }
    });
  };

  const canDelete = quote.status !== "APPROVED";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar cotización
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                ¿Estás seguro de que deseas eliminar la cotización para{" "}
                <strong>{quote.cliente.nombre}</strong>?
              </p>
              
              {!canDelete && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-yellow-800 text-sm">
                    <strong>No se puede eliminar esta cotización</strong>
                    <p>Las cotizaciones aprobadas no pueden ser eliminadas por razones de auditoría.</p>
                  </div>
                </div>
              )}
              
              {canDelete && (
                <p className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            Cancelar
          </AlertDialogCancel>
          {canDelete && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
