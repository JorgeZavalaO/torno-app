"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle, XCircle, Edit } from "lucide-react";
import { updateQuoteStatus } from "@/app/(protected)/cotizador/actions";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

type Quote = {
  id: string;
  status: QuoteStatus;
  cliente: { nombre: string };
};

interface QuoteStatusDialogProps {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { 
    value: "DRAFT", 
    label: "Borrador", 
    description: "Cotización en proceso de elaboración",
    icon: Edit,
    color: "text-gray-600"
  },
  { 
    value: "SENT", 
    label: "Enviada", 
    description: "Cotización enviada al cliente",
    icon: Send,
    color: "text-blue-600"
  },
  { 
    value: "APPROVED", 
    label: "Aprobada", 
    description: "Cotización aprobada por el cliente",
    icon: CheckCircle,
    color: "text-green-600"
  },
  { 
    value: "REJECTED", 
    label: "Rechazada", 
    description: "Cotización rechazada por el cliente",
    icon: XCircle,
    color: "text-red-600"
  },
];

export function QuoteStatusDialog({ quote, open, onOpenChange }: QuoteStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<QuoteStatus>(quote.status);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const currentOption = statusOptions.find(opt => opt.value === quote.status);
  const newOption = statusOptions.find(opt => opt.value === newStatus);

  const handleStatusChange = () => {
    if (newStatus === quote.status) {
      toast.info("No hay cambios en el estado");
      return;
    }

    // Validaciones especiales
    if (quote.status === "APPROVED" && newStatus !== "APPROVED") {
      if (!confirm("¿Estás seguro de cambiar el estado de una cotización aprobada?")) {
        return;
      }
    }

    if (newStatus === "REJECTED" && !notes.trim()) {
      toast.error("Debes agregar una nota explicando el motivo del rechazo");
      return;
    }

    startTransition(async () => {
      const result = await updateQuoteStatus(quote.id, newStatus, notes.trim() || undefined);
      
      if (result.ok) {
        toast.success(result.message || "Estado actualizado correctamente");
        onOpenChange(false);
        window.location.reload();
      } else {
        toast.error(result.message || "Error al actualizar el estado");
      }
    });
  };

  const resetForm = () => {
    setNewStatus(quote.status);
    setNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !pending) {
      resetForm();
    }
    onOpenChange(open);
  };

  const isStatusDowngrade = (current: QuoteStatus, next: QuoteStatus) => {
    const hierarchy = { "DRAFT": 0, "SENT": 1, "APPROVED": 2, "REJECTED": 1 };
    return hierarchy[next] < hierarchy[current];
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Cambiar estado de cotización
          </DialogTitle>
          <DialogDescription>
            Cotización para <strong>{quote.cliente.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Estado actual */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-2 rounded-full bg-background ${currentOption?.color}`}>
              {currentOption?.icon && <currentOption.icon className="h-4 w-4" />}
            </div>
            <div>
              <div className="font-medium">Estado actual: {currentOption?.label}</div>
              <div className="text-sm text-muted-foreground">{currentOption?.description}</div>
            </div>
          </div>

          {/* Selector de nuevo estado */}
          <div className="space-y-2">
            <Label htmlFor="status">Nuevo estado</Label>
            <Select 
              value={newStatus} 
              onValueChange={(value) => setNewStatus(value as QuoteStatus)}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-3 py-1">
                      <option.icon className={`h-4 w-4 ${option.color}`} />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advertencia para cambios sensibles */}
          {isStatusDowngrade(quote.status, newStatus) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Advertencia</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Estás cambiando el estado a uno de menor prioridad. Asegúrate de que esto es correcto.
              </p>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notas {newStatus === "REJECTED" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="notes"
              placeholder={
                newStatus === "REJECTED" 
                  ? "Explica el motivo del rechazo..." 
                  : "Agregar comentarios sobre el cambio de estado..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
              rows={3}
              className={newStatus === "REJECTED" && !notes.trim() ? "border-destructive" : ""}
            />
            {newStatus === "REJECTED" && (
              <p className="text-xs text-muted-foreground">
                * Obligatorio para rechazos
              </p>
            )}
          </div>

          {/* Vista previa del cambio */}
          {newStatus !== quote.status && (
            <div className="flex items-center justify-center gap-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                {currentOption?.icon && <currentOption.icon className={`h-4 w-4 ${currentOption.color}`} />}
                <span className="text-sm font-medium">{currentOption?.label}</span>
              </div>
              <div className="text-blue-600">→</div>
              <div className="flex items-center gap-2">
                {newOption?.icon && <newOption.icon className={`h-4 w-4 ${newOption.color}`} />}
                <span className="text-sm font-medium">{newOption?.label}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleStatusChange}
            disabled={pending || newStatus === quote.status || (newStatus === "REJECTED" && !notes.trim())}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Confirmar cambio"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
