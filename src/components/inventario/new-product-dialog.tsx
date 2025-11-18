"use client";

import { useState, useTransition } from "react";
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
import { Package, Sparkles, AlertCircle, DollarSign, Boxes, Link2, CheckCircle2 } from "lucide-react";
// Category options should be provided from server via catalog; fallback to empty array

interface FormErrors {
  sku?: string;
  nombre?: string;
  categoria?: string;
  uom?: string;
  costo?: string;
  stockMinimo?: string;
  equivalentes?: string;
}

// Mapa de prefijos de categoría (hardcoded para evitar problemas de importación)
const CATEGORY_PREFIX_MAP: Record<string, string> = {
  MATERIA_PRIMA: "MP",
  PIEZA_FABRICADA: "FB",
  HERRAMIENTA_CORTE: "HC",
  HERRAMIENTA: "HE",
  CONSUMIBLE: "CO",
  REPUESTO: "RP",
  INSUMO: "IN",
  REFACCION: "RF",
  FABRICACION: "FB",
};

export function NewProductDialog({
  open, onOpenChange, onSuccess, actions, currency = "PEN",
  uomOptions = [],
  categoryOptions = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  actions: { createProduct: (fd: FormData) => Promise<{ok: boolean; message?: string; sku?: string}> };
  currency?: string;
  uomOptions?: { value: string; label: string }[];
  categoryOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<string>(categoryOptions[0]?.value || "");
  const [uom, setUom] = useState(uomOptions[0]?.value || "pz");
  const [costo, setCosto] = useState<number | "">(0);
  const [stockMinimo, setStockMinimo] = useState<number | "">("");
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, start] = useTransition();
  // Códigos equivalentes opcionales (máx 3 filas simples)
  const [eqCodes, setEqCodes] = useState<Array<{ sistema: string; codigo: string; descripcion?: string }>>([
    { sistema: "", codigo: "", descripcion: "" },
  ]);

  // Generate SKU preview based on category - same logic as server
  const generateSkuPreview = () => {
    if (!categoria || !autoGenerateSku) return "";
    
    const prefix = CATEGORY_PREFIX_MAP[categoria] || "XX";
    // Show as PREFIX-999 to indicate it will be auto-generated with counter
    return `${prefix}-999`;
  };

  const skuPreview = generateSkuPreview();

  const reset = () => {
    setSku("");
    setNombre("");
    setCategoria(categoryOptions[0]?.value || "");
    setUom(uomOptions[0]?.value || "pz");
    setCosto(0);
    setStockMinimo("");
    setAutoGenerateSku(true);
    setErrors({});
    setEqCodes([{ sistema: "", codigo: "", descripcion: "" }]);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validar nombre (obligatorio)
    if (!nombre.trim()) {
      newErrors.nombre = "El nombre del producto es obligatorio";
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    } else if (nombre.trim().length > 100) {
      newErrors.nombre = "El nombre no puede exceder 100 caracteres";
    }

    // Validar categoría (obligatorio)
    if (!categoria || categoria.trim() === "") {
      newErrors.categoria = "Debes seleccionar una categoría";
    }

    // Validar UOM (obligatorio)
    if (!uom || uom.trim() === "") {
      newErrors.uom = "Debes seleccionar una unidad de medida";
    }

    // Validar SKU personalizado si está activado
    if (!autoGenerateSku) {
      if (!sku.trim()) {
        newErrors.sku = "El SKU personalizado es obligatorio si no usas generación automática";
      } else {
        const skuPattern = /^[A-Z0-9-_]{3,20}$/;
        if (!skuPattern.test(sku.trim())) {
          newErrors.sku = "SKU debe contener solo letras mayúsculas, números, guiones y entre 3-20 caracteres";
        }
      }
    }

    // Validar costo
    if (costo !== "" && Number(costo) < 0) {
      newErrors.costo = "El costo no puede ser negativo";
    }

    // Validar stock mínimo
    if (stockMinimo !== "" && Number(stockMinimo) < 0) {
      newErrors.stockMinimo = "El stock mínimo no puede ser negativo";
    }

    // Validar códigos equivalentes
    const validEqCodes = eqCodes.filter(e => e.sistema.trim() || e.codigo.trim());
    for (const eq of validEqCodes) {
      if (eq.sistema.trim() && !eq.codigo.trim()) {
        newErrors.equivalentes = "Si especificas un sistema, el código es obligatorio";
        break;
      }
      if (!eq.sistema.trim() && eq.codigo.trim()) {
        newErrors.equivalentes = "Si especificas un código, el sistema es obligatorio";
        break;
      }
      // Validar longitud de campos
      if (eq.sistema.trim().length > 50) {
        newErrors.equivalentes = "El nombre del sistema no puede exceder 50 caracteres";
        break;
      }
      if (eq.codigo.trim().length > 100) {
        newErrors.equivalentes = "El código no puede exceder 100 caracteres";
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = () => {
    if (!validateForm()) {
      // Mostrar el primer error encontrado
      const firstError = Object.entries(errors)[0];
      if (firstError) {
        const [field, message] = firstError;
        const fieldNames: Record<string, string> = {
          nombre: "Nombre",
          categoria: "Categoría",
          uom: "Unidad de medida",
          sku: "SKU",
          costo: "Costo",
          stockMinimo: "Stock mínimo",
          equivalentes: "Códigos equivalentes"
        };
        toast.error(`Error en ${fieldNames[field]}: ${message}`);
      } else {
        toast.error("Corrige los errores en el formulario");
      }
      return;
    }

    const fd = new FormData();
    
    if (!autoGenerateSku && sku.trim()) {
      fd.set("sku", sku.trim().toUpperCase());
    }

    fd.set("nombre", nombre.trim());
    fd.set("categoria", categoria);
    fd.set("uom", uom);
    
    // Asegurar que costo siempre sea un número válido
    const costoValue = costo === "" ? 0 : Number(costo);
    fd.set("costo", String(costoValue));
    
    // Solo enviar stockMinimo si tiene valor
    if (stockMinimo !== "" && stockMinimo !== null) {
      fd.set("stockMinimo", String(Number(stockMinimo)));
    }
    
    // Adjuntar códigos equivalentes válidos
    const cleanEq = eqCodes
      .filter(e => e.sistema.trim() && e.codigo.trim())
      .map(e => ({ sistema: e.sistema.trim(), codigo: e.codigo.trim(), descripcion: e.descripcion?.trim() || undefined }));
    
    if (cleanEq.length > 0) {
      fd.set('equivalentes', JSON.stringify(cleanEq.slice(0, 3)));
    }

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
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold">Nuevo producto</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Agrega un nuevo SKU al inventario completando los datos necesarios
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {/* SKU Configuration - Card Style */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <Label className="text-base font-semibold">Configuración de SKU</Label>
              </div>
              <div className="flex items-center space-x-2 bg-background px-3 py-1.5 rounded-lg">
                <Label htmlFor="auto-sku" className="text-xs font-medium cursor-pointer">Generar automáticamente</Label>
                <Switch
                  id="auto-sku"
                  checked={autoGenerateSku}
                  onCheckedChange={setAutoGenerateSku}
                />
              </div>
            </div>

            {!autoGenerateSku && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="sku" className="text-sm font-medium">
                  SKU personalizado *
                </Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={e => setSku(e.target.value.toUpperCase())}
                  placeholder="MP-001, PROD-ABC, etc."
                  className={`uppercase font-mono text-center ${errors.sku ? "border-red-500 bg-red-50/30" : ""}`}
                />
                {errors.sku && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2 rounded">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.sku}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  📝 Formato: Letras mayúsculas, números y guiones. Entre 3 y 20 caracteres.
                </p>
              </div>
            )}

            {autoGenerateSku && skuPreview && (
              <div className="p-3 bg-primary/5 rounded-lg border-2 border-primary/20 border-dashed mt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">SKU generado:</span>
                  </div>
                  <Badge className="font-mono text-base px-3 py-1 bg-primary text-white">{skuPreview.slice(0, -3)}###</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ✨ Se creará automáticamente con contador secuencial (ej: MP-001, MP-002, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Basic Information - Card Style */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue/20">
                <Boxes className="h-4 w-4 text-blue-600" />
              </div>
              <Label className="text-base font-semibold">Información básica</Label>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm font-medium">
                  Nombre del producto *
                </Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Acero inoxidable 304, Rodamiento 6203..."
                  maxLength={100}
                  className={errors.nombre ? "border-red-500 bg-red-50/30" : "border-border/50"}
                />
                {errors.nombre && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2 rounded">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.nombre}
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Visible en reportes y listados</span>
                  <span className={`font-medium ${nombre.length > 90 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {nombre.length}/100
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria" className="text-sm font-medium">
                    Categoría *
                  </Label>
                  <Select 
                    value={categoria} 
                    onValueChange={setCategoria}
                  >
                    <SelectTrigger id="categoria" className={errors.categoria ? "border-red-500 bg-red-50/30" : "border-border/50"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {c.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {c.value.replace("_", "-").toLowerCase()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoria && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2 rounded">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errors.categoria}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uom" className="text-sm font-medium">
                    Unidad de medida *
                  </Label>
                  <Select value={uom} onValueChange={setUom}>
                    <SelectTrigger id="uom" className={errors.uom ? "border-red-500 bg-red-50/30" : "border-border/50"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uomOptions.map(um => (
                        <SelectItem key={um.value} value={um.value} className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{um.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {um.value}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.uom && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2 rounded">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errors.uom}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Information - Card Style */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-500/20">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <Label className="text-base font-semibold">Información financiera</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costo" className="text-sm font-medium">
                  Costo de referencia
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                    {currency === "USD" ? "$" : "S/"}
                  </span>
                  <Input
                    id="costo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={costo}
                    onChange={e => setCosto(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className={`pl-8 text-right font-mono ${errors.costo ? "border-red-500 bg-red-50/30" : "border-border/50"}`}
                  />
                </div>
                {errors.costo && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2 rounded">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.costo}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  💰 Costo promedio para valorización de inventario
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockMinimo" className="text-sm font-medium">
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
                  className={`text-right font-mono ${errors.stockMinimo ? "border-red-500 bg-red-50/30" : "border-border/50"}`}
                />
                {errors.stockMinimo && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2 rounded">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.stockMinimo}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  ⚠️ Alertas cuando esté por debajo de este nivel
                </p>
              </div>
            </div>
          </div>

          {/* Códigos equivalentes opcionales - Card Style */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-500/20">
                  <Link2 className="h-4 w-4 text-purple-600" />
                </div>
                <Label className="text-base font-semibold">Códigos equivalentes (opcional)</Label>
              </div>
              {eqCodes.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEqCodes(prev => [...prev, { sistema: "", codigo: "", descripcion: "" }])}
                  className="text-xs"
                >
                  + Agregar fila
                </Button>
              )}
            </div>
            <div className="grid gap-3">
              {eqCodes.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end bg-background/50 p-2 rounded border">
                  <Input
                    placeholder="Sistema (SAP, Odoo, etc.)"
                    value={row.sistema}
                    onChange={e => {
                      const v = e.target.value;
                      setEqCodes(arr => arr.map((r,i)=> i===idx? { ...r, sistema: v }: r));
                    }}
                    className={`text-sm ${errors.equivalentes ? "border-red-500" : "border-border/50"}`}
                  />
                  <Input
                    placeholder="Código en el sistema"
                    value={row.codigo}
                    onChange={e => {
                      const v = e.target.value;
                      setEqCodes(arr => arr.map((r,i)=> i===idx? { ...r, codigo: v }: r));
                    }}
                    className={`text-sm ${errors.equivalentes ? "border-red-500" : "border-border/50"}`}
                  />
                  <div className="flex gap-1">
                    <Input
                      placeholder="Descripción"
                      value={row.descripcion || ""}
                      onChange={e => {
                        const v = e.target.value;
                        setEqCodes(arr => arr.map((r,i)=> i===idx? { ...r, descripcion: v }: r));
                      }}
                      className="text-sm border-border/50"
                    />
                    {eqCodes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEqCodes(arr => arr.filter((_,i)=>i!==idx))}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {errors.equivalentes && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2 rounded">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errors.equivalentes}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                🔗 Mapea el SKU con códigos de sistemas externos (ERP). Opcional.
              </p>
            </div>
          </div>

          {/* Summary - Prominently displayed */}
          {nombre && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-base font-bold text-primary">Resumen del producto</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 px-3 bg-background/60 rounded border border-primary/20">
                  <span className="text-muted-foreground font-medium">📝 Nombre:</span>
                  <span className="font-semibold text-right">{nombre}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-background/60 rounded border border-primary/20">
                  <span className="text-muted-foreground font-medium">🆔 SKU:</span>
                  <span className="font-mono font-bold text-primary">
                    {autoGenerateSku ? (skuPreview || "Se generará automáticamente") : (sku || "Personalizado")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-background/60 rounded border border-primary/20">
                  <span className="text-muted-foreground font-medium">📦 Categoría:</span>
                  <Badge className="bg-primary/20 text-primary border-primary/50">
                    {categoryOptions.find(c => c.value === categoria)?.label || categoria}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-background/60 rounded border border-primary/20">
                  <span className="text-muted-foreground font-medium">⚖️ Unidad:</span>
                  <span className="font-medium">{uomOptions.find(u => u.value === uom)?.label || uom}</span>
                </div>
                {costo !== "" && Number(costo) > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-background/60 rounded border border-green-500/30">
                    <span className="text-muted-foreground font-medium">💰 Costo:</span>
                    <span className="font-mono font-bold text-green-600">{currency === "USD" ? "$" : "S/"}{Number(costo).toFixed(2)}</span>
                  </div>
                )}
                {stockMinimo !== "" && Number(stockMinimo) > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-background/60 rounded border border-amber-500/30">
                    <span className="text-muted-foreground font-medium">📊 Stock mínimo:</span>
                    <span className="font-medium text-amber-600">{stockMinimo} {uom}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col-reverse sm:flex-row gap-3">
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
            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
          >
            {pending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creando producto...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Crear producto
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}