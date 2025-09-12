"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Clock, Save, X } from "lucide-react";
import { toast } from "sonner";

interface MachineEventFormProps {
  machineId: string;
  machineName: string;
  onEventLogged: (data: FormData) => Promise<{ ok: boolean; message?: string }>;
  onClose?: () => void;
  eventOptions?: { value: string; label: string; color?: string | null }[];
}

export function MachineEventForm({ 
  machineId, 
  machineName, 
  onEventLogged, 
  onClose,
  eventOptions,
}: MachineEventFormProps) {
  const router = useRouter();
  const [tipoEvento, setTipoEvento] = useState<"PARO" | "AVERIA">("PARO");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
  );
  const [fechaFin, setFechaFin] = useState("");
  const [horas, setHoras] = useState<number>(1);
  const [nota, setNota] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fechaInicio.trim()) {
      toast.error("La fecha de inicio es requerida");
      return;
    }

    // Validar fechas si se proporciona fecha de fin
    if (fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
      toast.error("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    // Calcular horas automáticamente si se proporcionan ambas fechas
    let horasCalculadas = horas;
    if (fechaInicio && fechaFin) {
      const diffMs = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime();
      horasCalculadas = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Redondear a 2 decimales
      
      if (horasCalculadas <= 0) {
        toast.error("Las fechas no son válidas");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("maquinaId", machineId);
      fd.set("tipo", tipoEvento);
      fd.set("inicio", new Date(fechaInicio).toISOString());
      if (fechaFin) {
        fd.set("fin", new Date(fechaFin).toISOString());
      }
      fd.set("horas", String(horasCalculadas));
      if (nota.trim()) {
        fd.set("nota", nota.trim());
      }

      const result = await onEventLogged(fd);
      
      if (result.ok) {
        toast.success(result.message || "Evento registrado correctamente");
        
        // Reset form
        setTipoEvento("PARO");
        setFechaInicio(new Date().toISOString().slice(0, 16));
        setFechaFin("");
        setHoras(1);
        setNota("");
        
        onClose?.();
        startTransition(() => router.refresh());
      } else {
        toast.error(result.message || "Error al registrar el evento");
      }
    } catch (error) {
      console.error("Error registrando evento:", error);
      toast.error("Error inesperado al registrar el evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEventIcon = () => {
    switch (tipoEvento) {
      case "PARO":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "AVERIA":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getEventColor = () => {
    switch (tipoEvento) {
      case "PARO":
        return "border-orange-200 bg-orange-50";
      case "AVERIA":
        return "border-red-200 bg-red-50";
      default:
        return "";
    }
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${getEventColor()}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getEventIcon()}
            <CardTitle className="text-lg">
              Registrar Evento - {machineName}
            </CardTitle>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de evento */}
          <div className="space-y-2">
            <Label htmlFor="tipo-evento">Tipo de evento</Label>
            <Select value={tipoEvento} onValueChange={(value) => setTipoEvento(value as "PARO" | "AVERIA")}>
              <SelectTrigger id="tipo-evento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventOptions && eventOptions.length > 0 ? (
                  eventOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: opt.color || '#999' }} />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="PARO">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>Paro por falla</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="AVERIA">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span>Avería</span>
                      </div>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tipoEvento === "PARO" 
                ? "Paro temporal por falla que se puede resolver rápidamente"
                : "Avería que requiere reparación o mantenimiento correctivo"
              }
            </p>
          </div>

          <Separator />

          {/* Fechas y duración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-inicio">Fecha y hora de inicio *</Label>
              <Input
                id="fecha-inicio"
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-fin">Fecha y hora de fin (opcional)</Label>
              <Input
                id="fecha-fin"
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
              />
              <p className="text-xs text-muted-foreground">
                Si se especifica, las horas se calcularán automáticamente
              </p>
            </div>
          </div>

          {/* Horas manuales */}
          {!fechaFin && (
            <div className="space-y-2">
              <Label htmlFor="horas">Duración en horas</Label>
              <Input
                id="horas"
                type="number"
                min={0.1}
                step="0.1"
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Especifique la duración del evento en horas (ej: 1.5 para 1 hora y 30 min)
              </p>
            </div>
          )}

          {/* Horas calculadas automáticamente */}
          {fechaFin && (
            <div className="space-y-2">
              <Label>Duración calculada</Label>
              <div className="p-2 bg-muted rounded-md">
                <span className="font-mono">
                  {(() => {
                    const diffMs = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime();
                    const horasCalculadas = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                    return `${horasCalculadas} horas`;
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="nota">Descripción del evento</Label>
            <Textarea
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Describa el problema, causas, acciones tomadas..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Proporcione detalles sobre el evento para facilitar el seguimiento
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                "Registrando..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Registrar evento
                </>
              )}
            </Button>
            
            {onClose && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}