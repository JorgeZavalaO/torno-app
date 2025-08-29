"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Package, TrendingUp, TrendingDown, Settings, AlertCircle } from "lucide-react";

const types = [
  { 
    v: "INGRESO_COMPRA", 
    label: "Ingreso por compra", 
    description: "Productos recibidos de proveedores",
    icon: TrendingUp,
    color: "bg-green-50 text-green-700 border-green-200"
  },
  { 
    v: "INGRESO_AJUSTE", 
    label: "Ingreso por ajuste", 
    description: "Corrección de inventario (aumentar stock)",
    icon: Settings,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  { 
    v: "SALIDA_AJUSTE", 
    label: "Salida por ajuste", 
    description: "Corrección de inventario (reducir stock)",
    icon: Settings,
    color: "bg-orange-50 text-orange-700 border-orange-200"
  },
  { 
    v: "SALIDA_OT", 
    label: "Salida a OT", 
    description: "Materiales asignados a orden de trabajo",
    icon: TrendingDown,
    color: "bg-red-50 text-red-700 border-red-200"
  },
] as const;

interface FormErrors {
  productoId?: string;
  cantidad?: string;
  costoUnitario?: string;
  refTabla?: string;
  refId?: string;
}

export function NewMovementDialog({
  open, onOpenChange, products, actions, onSuccess, currency = "PEN"
}: {
  open: boolean; 
  onOpenChange: (o: boolean) => void;
  products: Array<{ sku: string; nombre: string; uom: string }>;
  actions: { createMovement: (fd: FormData) => Promise<{ok: boolean; message?: string}> };
  onSuccess: (msg: string) => void;
  currency?: string;
}) {
  const router = useRouter();
  const [productoId, setProductoId] = useState("");
  const [tipo, setTipo] = useState<typeof types[number]["v"]>("INGRESO_COMPRA");
  const [cantidad, setCantidad] = useState<number | "">(1);
  const [costoUnitario, setCostoUnitario] = useState<number | "">(0);
  const [refTabla, setRefTabla] = useState("");
  const [refId, setRefId] = useState("");
  const [nota, setNota] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, start] = useTransition();

  // Auto-select first product when dialog opens
  useEffect(() => {
    if (open && products.length > 0 && !productoId) {
      setProductoId(products[0].sku);
    }
  }, [open, products, productoId]);

  const selectedProduct = products.find(p => p.sku === productoId);
  const selectedType = types.find(t => t.v === tipo);
  const isIngreso = tipo.startsWith("INGRESO");
  
  const reset = () => {
    setProductoId(products[0]?.sku ?? "");
    setTipo("INGRESO_COMPRA");
    setCantidad(1);
    setCostoUnitario(0);
    setRefTabla("");
    setRefId("");
    setNota("");
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!productoId) {
      newErrors.productoId = "Selecciona un producto";
    }
    
    if (!cantidad || cantidad <= 0) {
      newErrors.cantidad = "La cantidad debe ser mayor a 0";
    }
    
    if (isIngreso && (!costoUnitario || costoUnitario < 0)) {
      newErrors.costoUnitario = "El costo debe ser mayor o igual a 0";
    }

    // Validate reference fields together
    if (refTabla && !refId) {
      newErrors.refId = "Ingresa el ID de referencia";
    }
    if (refId && !refTabla) {
      newErrors.refTabla = "Especifica el tipo de referencia";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = () => {
    if (!validateForm()) {
      toast.error("Corrige los errores en el formulario");
      return;
    }

    const fd = new FormData();
    fd.set("productoId", productoId);
    fd.set("tipo", tipo);
    fd.set("cantidad", String(cantidad));
    fd.set("costoUnitario", String(costoUnitario || 0));
    if (refTabla) fd.set("refTabla", refTabla);
    if (refId) fd.set("refId", refId);
    if (nota) fd.set("nota", nota);

    start(async () => {
      const r = await actions.createMovement(fd);
      if (r.ok) {
        onSuccess(r.message ?? "Movimiento registrado correctamente");
        onOpenChange(false);
        reset();
        router.refresh();
      } else {
        toast.error(r.message ?? "Error al registrar el movimiento");
      }
    });
  };

  const handleOpenChange = (o: boolean) => {
    if (!pending) {
      if (!o) reset(); // Reset form when closing
      onOpenChange(o);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = selectedType?.icon ?? Package;
              const colorCls = selectedType?.color ?? "bg-primary/10 text-primary";
              return (
                <div className={`p-2 rounded-lg ${colorCls}`}>
                  <Icon className="h-5 w-5" />
                </div>
              );
            })()}
            <div>
              <DialogTitle className="text-xl">Nuevo movimiento de inventario</DialogTitle>
              <DialogDescription>
                {selectedType?.description ?? "Registra un ingreso o salida de stock con toda la información necesaria"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="producto" className="text-sm font-medium">
              Producto *
            </Label>
            <Select value={productoId} onValueChange={setProductoId}>
              <SelectTrigger 
                id="producto"
                className={errors.productoId ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Busca y selecciona un producto..." />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.sku} value={p.sku} className="py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{p.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.sku} • {p.uom}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productoId && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.productoId}
              </div>
            )}
            {selectedProduct && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedProduct.nombre}</span>
                  <Badge variant="outline">{selectedProduct.uom}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Movement Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de movimiento *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {types.map(type => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.v}
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      tipo === type.v 
                        ? `${type.color} border-current` 
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setTipo(type.v)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {type.description}
                        </div>
                      </div>
                    </div>
                    {tipo === type.v && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Quantity and Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad" className="text-sm font-medium">
                Cantidad * {selectedProduct && `(${selectedProduct.uom})`}
              </Label>
              <Input
                id="cantidad"
                type="number"
                step="0.001"
                min="0.001"
                value={cantidad}
                onChange={e => setCantidad(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ingresa la cantidad"
                className={errors.cantidad ? "border-red-500" : ""}
              />
              {errors.cantidad && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.cantidad}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo" className="text-sm font-medium">
                {isIngreso ? "Costo unitario *" : "Costo unitario (referencia)"}
              </Label>
              <Input
                id="costo"
                type="number"
                step="0.01"
                min="0"
                value={costoUnitario}
                onChange={e => setCostoUnitario(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className={errors.costoUnitario ? "border-red-500" : ""}
              />
              {errors.costoUnitario && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.costoUnitario}
                </div>
              )}
              {!isIngreso && (
                <p className="text-xs text-muted-foreground">
                  Opcional para salidas, útil para valorización
                </p>
              )}
            </div>
          </div>

          {/* Cost Summary */}
    {cantidad && costoUnitario && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span>Valor total del movimiento:</span>
                <span className="font-mono font-medium">
      {currency === "USD" ? "$" : "S/"}{(Number(cantidad) * Number(costoUnitario)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Reference Fields */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Referencias (opcional)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refTabla" className="text-xs text-muted-foreground">
                  Tipo de referencia
                </Label>
                <Input
                  id="refTabla"
                  value={refTabla}
                  onChange={e => setRefTabla(e.target.value)}
                  placeholder="OT, OC, FACT, etc."
                  className={errors.refTabla ? "border-red-500" : ""}
                />
                {errors.refTabla && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.refTabla}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="refId" className="text-xs text-muted-foreground">
                  ID/Número de referencia
                </Label>
                <Input
                  id="refId"
                  value={refId}
                  onChange={e => setRefId(e.target.value)}
                  placeholder="OT-001, FC-1234, etc."
                  className={errors.refId ? "border-red-500" : ""}
                />
                {errors.refId && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.refId}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Vincula este movimiento con documentos externos como órdenes de trabajo o compras
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="nota" className="text-sm font-medium">
              Notas adicionales (opcional)
            </Label>
            <Textarea
              id="nota"
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={3}
              placeholder="Información adicional sobre este movimiento..."
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Detalles que ayuden a entender el contexto del movimiento</span>
              <span>{nota.length}/500</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
          <Button 
            variant="outline" 
            disabled={pending} 
            onClick={() => handleOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button 
            disabled={pending} 
            onClick={submit}
            className="flex-1 sm:flex-none"
          >
            {pending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Guardando...
              </>
            ) : (
              "Registrar movimiento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}