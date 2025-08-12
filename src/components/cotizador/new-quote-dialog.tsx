"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calculator, Save, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Client = { id: string; nombre: string; ruc: string };
type CostingParams = Record<string, string | number>;
type CreateQuoteAction = (fd: FormData) => Promise<{ ok: boolean; id?: string; message?: string }>;

interface NewQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  params: CostingParams;
  action: CreateQuoteAction;
}

export function NewQuoteDialog({ 
  open, 
  onOpenChange, 
  clients, 
  params, 
  action 
}: NewQuoteDialogProps) {
  const currency = String(params.currency || "PEN");
  const [clienteId, setClienteId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [materials, setMaterials] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [kwh, setKwh] = useState<number>(0);
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const gi = Number(params.gi ?? 0);
  const margin = Number(params.margin ?? 0);
  const hourlyRate = Number(params.hourlyRate ?? 0);
  const kwhRate = Number(params.kwhRate ?? 0);
  const depr = Number(params.deprPerHour ?? 0);
  const tooling = Number(params.toolingPerPiece ?? 0);
  const rent = Number(params.rentPerHour ?? 0);

  const calculation = useMemo(() => {
    const labor = hourlyRate * hours;
    const energy = kwhRate * kwh;
    const depreciation = depr * hours;
    const toolingCost = tooling * qty;
    const rentCost = rent * hours;
    const direct = materials + labor + energy + depreciation + toolingCost + rentCost;
    const giAmount = direct * gi;
    const subtotal = direct + giAmount;
    const marginAmount = subtotal * margin;
    const total = subtotal + marginAmount;
    const unitPrice = qty > 0 ? total / qty : total;
    
    return { 
      labor, energy, depreciation, toolingCost, rentCost, 
      direct, giAmount, subtotal, marginAmount, total, unitPrice 
    };
  }, [materials, hours, kwh, qty, gi, margin, hourlyRate, kwhRate, depr, tooling, rent]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency 
    }).format(amount);

  const resetForm = () => {
    setClienteId("");
    setQty(1);
    setMaterials(0);
    setHours(0);
    setKwh(0);
    setNotes("");
    // Mantener la fecha de vigencia
  };

  const handleSubmit = () => {
    if (!clienteId) return toast.error("Selecciona un cliente");
    if (qty < 1) return toast.error("La cantidad mínima es 1");

    const formData = new FormData();
    formData.set("clienteId", clienteId);
    formData.set("qty", String(qty));
    formData.set("materials", String(materials));
    formData.set("hours", String(hours));
    formData.set("kwh", String(kwh));
    if (validUntil) formData.set("validUntil", validUntil);
    if (notes) formData.set("notes", notes);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success("Cotización creada exitosamente");
        resetForm();
        onOpenChange(false);
        if (result.id) {
          window.location.href = `/cotizador/${result.id}`;
        }
      } else {
        toast.error(result.message ?? "Error al crear la cotización");
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !pending) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Establecer fecha por defecto
  useEffect(() => {
    if (open && !validUntil) {
      const date = new Date();
      date.setDate(date.getDate() + 15);
      setValidUntil(date.toISOString().slice(0, 10));
    }
  }, [open, validUntil]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Nueva cotización
          </DialogTitle>
          <DialogDescription>
            Completa los datos para generar una nueva cotización
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
            {/* Formulario */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Información General
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cliente">Cliente *</Label>
                      <Select value={clienteId} onValueChange={setClienteId} disabled={pending}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              <div>
                                <div className="font-medium">{client.nombre}</div>
                                <div className="text-sm text-muted-foreground">
                                  RUC: {client.ruc}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Vigente hasta</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        disabled={pending}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Parámetros de Producción
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qty">Cantidad (piezas) *</Label>
                      <Input
                        id="qty"
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                        disabled={pending}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="materials">Materiales ({currency})</Label>
                      <Input
                        id="materials"
                        type="number"
                        step="0.01"
                        min={0}
                        value={materials}
                        onChange={(e) => setMaterials(Number(e.target.value))}
                        disabled={pending}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours">Horas de torno</Label>
                      <Input
                        id="hours"
                        type="number"
                        step="0.01"
                        min={0}
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value))}
                        disabled={pending}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="kwh">Consumo energético (kWh)</Label>
                      <Input
                        id="kwh"
                        type="number"
                        step="0.01"
                        min={0}
                        value={kwh}
                        onChange={(e) => setKwh(Number(e.target.value))}
                        disabled={pending}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Observaciones
                  </h3>
                  <Textarea
                    placeholder="Notas adicionales sobre la cotización..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={pending}
                    rows={3}
                  />
                </div>
              </Card>
            </div>

            {/* Panel de cálculo */}
            <div className="space-y-4">
              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Parámetros del Sistema
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gastos indirectos:</span>
                      <span className="font-medium">{(gi * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen de ganancia:</span>
                      <span className="font-medium">{(margin * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tarifa por hora:</span>
                      <span className="font-medium">{formatCurrency(hourlyRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tarifa kWh:</span>
                      <span className="font-medium">{formatCurrency(kwhRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Depreciación/hora:</span>
                      <span className="font-medium">{formatCurrency(depr)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Herramientas/pieza:</span>
                      <span className="font-medium">{formatCurrency(tooling)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Alquiler/hora:</span>
                      <span className="font-medium">{formatCurrency(rent)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Desglose de Costos
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Materiales</span>
                      <span>{formatCurrency(materials)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mano de obra</span>
                      <span>{formatCurrency(calculation.labor)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Energía</span>
                      <span>{formatCurrency(calculation.energy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Depreciación</span>
                      <span>{formatCurrency(calculation.depreciation)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Herramientas</span>
                      <span>{formatCurrency(calculation.toolingCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Alquiler</span>
                      <span>{formatCurrency(calculation.rentCost)}</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between font-medium">
                      <span>Costo directo</span>
                      <span>{formatCurrency(calculation.direct)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gastos indirectos</span>
                      <span>{formatCurrency(calculation.giAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>{formatCurrency(calculation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen</span>
                      <span>{formatCurrency(calculation.marginAmount)}</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>{formatCurrency(calculation.total)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Precio unitario</span>
                      <span>{formatCurrency(calculation.unitPrice)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear cotización
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
