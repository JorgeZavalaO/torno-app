"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar,
  DollarSign,
  Loader2,
  Shield,
  AlertTriangle,
  TrendingUp,
  Wrench,
  Plus
} from "lucide-react";

type Actions = {
  scheduleMaintenance: (fd: FormData) => Promise<{ok: boolean; message?: string}>;
};

interface MaintenanceScheduleDialogProps {
  maquinaId: string;
  actions: Actions;
  trigger?: React.ReactNode;
  maintenanceOptions?: { value: string; label: string; descripcion?: string | null; icono?: string | null }[];
}

export default function MaintenanceScheduleDialog({ 
  maquinaId, 
  actions, 
  trigger,
  maintenanceOptions,
}: MaintenanceScheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipoMant, setTipoMant] = useState("PREVENTIVO");
  const [fechaProgMant, setFechaProgMant] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [costoEstimado, setCostoEstimado] = useState("");
  const [notaMant, setNotaMant] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTipoMant("PREVENTIVO");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFechaProgMant(tomorrow.toISOString().slice(0, 16));
    setCostoEstimado("");
    setNotaMant("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fechaProgMant) {
      toast.error("La fecha es requerida");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("maquinaId", maquinaId);
      fd.set("tipo", tipoMant);
      fd.set("fechaProg", new Date(fechaProgMant).toISOString());
      if (costoEstimado) fd.set("costoEstimado", costoEstimado);
      if (notaMant.trim()) fd.set("nota", notaMant.trim());

      const result = await actions.scheduleMaintenance(fd);
      if (result.ok) {
        toast.success(result.message || "Mantenimiento programado correctamente");
        resetForm();
        setOpen(false);
        startTransition(() => router.refresh());
      } else {
        toast.error(result.message || "Error al programar mantenimiento");
      }
    } catch (error) {
      toast.error("Error inesperado");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button className="w-full">
      <Plus className="h-4 w-4 mr-2" />
      Programar Mantenimiento
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Programar Mantenimiento
          </DialogTitle>
          <DialogDescription>
            Programa un nuevo mantenimiento para esta máquina. Todos los campos son opcionales excepto la fecha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipoMant" className="text-sm font-medium">
                Tipo de mantenimiento
              </Label>
              <Select value={tipoMant} onValueChange={setTipoMant}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceOptions && maintenanceOptions.length > 0 ? (
                    maintenanceOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-3">
                          {/* icono string opcional futuro */}
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            {opt.descripcion && (
                              <div className="text-xs text-muted-foreground">{opt.descripcion}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="PREVENTIVO">
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">Preventivo</div>
                            <div className="text-xs text-muted-foreground">Mantenimiento programado</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="CORRECTIVO">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="font-medium">Correctivo</div>
                            <div className="text-xs text-muted-foreground">Reparación de fallas</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="PREDICTIVO">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium">Predictivo</div>
                            <div className="text-xs text-muted-foreground">Basado en análisis</div>
                          </div>
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Fecha programada */}
            <div className="space-y-2">
              <Label htmlFor="fechaProgMant" className="text-sm font-medium">
                Fecha y hora programada *
              </Label>
              <input
                type="datetime-local"
                id="fechaProgMant"
                value={fechaProgMant}
                onChange={(e) => setFechaProgMant(e.target.value)}
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          
          {/* Costo estimado */}
          <div className="space-y-2">
            <Label htmlFor="costoEstimado" className="text-sm font-medium">
              Costo estimado
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                id="costoEstimado"
                value={costoEstimado}
                onChange={(e) => setCostoEstimado(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Opcional. Ingresa el costo estimado del mantenimiento.
            </p>
          </div>
          
          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notaMant" className="text-sm font-medium">
              Descripción y notas
            </Label>
            <Textarea
              id="notaMant"
              value={notaMant}
              onChange={(e) => setNotaMant(e.target.value)}
              placeholder="Describe el trabajo a realizar, piezas necesarias, consideraciones especiales..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Programando...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Programar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}