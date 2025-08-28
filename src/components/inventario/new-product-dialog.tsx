"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Package, Sparkles, AlertCircle, Info } from "lucide-react";
import { unidadesMedida } from "../../app/(protected)/inventario/uoms";
import { CATEGORIES } from "@/lib/product-categories";

interface FormErrors {
  sku?: string;
  nombre?: string;
  categoria?: string;
  uom?: string;
  costo?: string;
  stockMinimo?: string;
}

export function NewProductDialog({
  open, onOpenChange, onSuccess, actions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  actions: { createProduct: (fd: FormData) => Promise<{ok: boolean; message?: string; sku?: string}> };
}) {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [uom, setUom] = useState("pz");
  const [costo, setCosto] = useState<number | "">(0);
  const [stockMinimo, setStockMinimo] = useState<number | "">("");
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, start] = useTransition();

  // Generate SKU preview based on category and name
  const generateSkuPreview = () => {
    if (!nombre || !autoGenerateSku) return "";
    
    const categoryPrefix = categoria.split('_')[0].substring(0, 2).toUpperCase();
    const namePrefix = nombre.split(' ')[0].substring(0, 3).toUpperCase();
    return `${categoryPrefix}${namePrefix}-XXX`;
  };

  const skuPreview = generateSkuPreview();

  const reset = () => {
    setSku("");
    setNombre("");
    setCategoria(CATEGORIES[0]);
    setUom("pz");
    setCosto(0);
    setStockMinimo("");
    setAutoGenerateSku(true);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!nombre.trim()) {
      newErrors.nombre = "El nombre del producto es obligatorio";
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    }

    if (!autoGenerateSku && sku.trim()) {
      const skuPattern = /^[A-Z0-9-_]{3,20}$/;
      if (!skuPattern.test(sku.trim())) {
        newErrors.sku = "SKU debe contener solo letras, números, guiones y ser entre 3-20 caracteres";
      }
    }

    if (costo !== "" && Number(costo) < 0) {
      newErrors.costo = "El costo no puede ser negativo";
    }

    if (stockMinimo !== "" && Number(stockMinimo) < 0) {
      newErrors.stockMinimo = "El stock mínimo no puede ser negativo";
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
    
    if (!autoGenerateSku && sku.trim()) {
      fd.set("sku", sku.trim().toUpperCase());
    }

    fd.set("nombre", nombre.trim());
    fd.set("categoria", categoria);
    fd.set("uom", uom);
    fd.set("costo", String(costo || 0));
    if (stockMinimo !== "") fd.set("stockMinimo", String(stockMinimo));

    start(async () => {
      const r = await actions.createProduct(fd);
      if (r.ok) {
        onSuccess(`${r.message ?? "Producto creado exitosamente"} ${r.sku ? `(SKU: ${r.sku})` : ''}`);
        onOpenChange(false);
        reset();
        router.refresh();
      } else {
        toast.error(r.message ?? "Error al crear el producto");
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
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Nuevo producto</DialogTitle>
              <DialogDescription>
                Crea un nuevo SKU en el inventario con toda la información necesaria
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* SKU Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Configuración de SKU</Label>
              <div className="flex items-center space-x-2">
                <Label htmlFor="auto-sku" className="text-sm">Generar automáticamente</Label>
                <Switch
                  id="auto-sku"
                  checked={autoGenerateSku}
                  onCheckedChange={setAutoGenerateSku}
                />
              </div>
            </div>

            {!autoGenerateSku && (
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm">
                  SKU personalizado *
                </Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={e => setSku(e.target.value.toUpperCase())}
                  placeholder="MP-001, PROD-ABC, etc."
                  className={`uppercase font-mono ${errors.sku ? "border-red-500" : ""}`}
                />
                {errors.sku && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.sku}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Solo letras mayúsculas, números y guiones. Entre 3 y 20 caracteres.
                </p>
              </div>
            )}

            {autoGenerateSku && skuPreview && (
              <div className="p-3 bg-muted/50 rounded-lg border-2 border-dashed">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Vista previa del SKU:</span>
                  <Badge variant="outline" className="font-mono">{skuPreview}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Se generará automáticamente basado en categoría y nombre
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Información básica</Label>
            
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm">
                Nombre del producto *
              </Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Descripción clara y concisa del producto"
                className={errors.nombre ? "border-red-500" : ""}
              />
              {errors.nombre && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.nombre}
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Nombre que aparecerá en reportes y listados</span>
                <span>{nombre.length}/100</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-sm">
                  Categoría *
                </Label>
                <Select 
                  value={categoria} 
                  onValueChange={v => setCategoria(v as (typeof CATEGORIES)[number])}
                >
                  <SelectTrigger id="categoria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.replace("_", "-").toLowerCase()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uom" className="text-sm">
                  Unidad de medida *
                </Label>
                <Select value={uom} onValueChange={setUom}>
                  <SelectTrigger id="uom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesMedida.map(um => (
                      <SelectItem key={um.value} value={um.value} className="py-3">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{um.label}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {um.value}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Información financiera</Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costo" className="text-sm">
                  Costo de referencia
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    id="costo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={costo}
                    onChange={e => setCosto(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className={`pl-8 ${errors.costo ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.costo && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.costo}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Costo promedio para valorización de inventario
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockMinimo" className="text-sm">
                  Stock mínimo
                </Label>
                <Input
                  id="stockMinimo"
                  type="number"
                  step="0.001"
                  min="0"
                  value={stockMinimo}
                  onChange={e => setStockMinimo(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Cantidad mínima..."
                  className={errors.stockMinimo ? "border-red-500" : ""}
                />
                {errors.stockMinimo && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.stockMinimo}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Alertas cuando el stock esté por debajo de este nivel
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {nombre && (
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Resumen del producto</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="font-medium">{nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono">
                    {autoGenerateSku ? (skuPreview || "Se generará automáticamente") : (sku || "Personalizado")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoría:</span>
                  <Badge variant="secondary" className="text-xs">
                    {categoria.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidad:</span>
                  <span>{unidadesMedida.find(u => u.value === uom)?.label} ({uom})</span>
                </div>
                {costo !== "" && Number(costo) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo:</span>
                    <span className="font-mono">${Number(costo).toFixed(2)}</span>
                  </div>
                )}
                {stockMinimo !== "" && Number(stockMinimo) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock mínimo:</span>
                    <span>{stockMinimo} {uom}</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
            disabled={pending || !nombre.trim()} 
            onClick={submit}
            className="flex-1 sm:flex-none"
          >
            {pending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creando producto...
              </>
            ) : (
              "Crear producto"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}