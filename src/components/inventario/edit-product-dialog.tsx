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
import { FractionInput } from "@/components/ui/fraction-input";
import { toast } from "sonner";
import { Edit, AlertCircle, Info, Trash2, Boxes, Ruler, Link2, DollarSign } from "lucide-react";
// Category options should be provided from server via catalog; fallback to empty array
import type { ProductRow } from "./types";

interface FormErrors {
  nombre?: string;
  categoria?: string;
  uom?: string;
  costo?: string;
  stockMinimo?: string;
  equivalentes?: string;
}

interface EquivalentCode {
  id?: string;
  sistema: string;
  codigo: string;
  descripcion?: string;
  isNew?: boolean;
  toDelete?: boolean;
}

export function EditProductDialog({
  open,
  onOpenChange,
  onSuccess,
  product,
  actions,
  currency = "PEN",
  uomOptions = [],
  categoryOptions = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  product: ProductRow | null;
  equivalentCodes?: Array<{ id: string; sistema: string; codigo: string; descripcion?: string | null }>; // Deprecated: se cargará automáticamente
  actions: {
    updateProduct: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    addEquivalentCode: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    removeEquivalentCode: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    getProductEquivalentCodes: (sku: string) => Promise<Array<{ id: string; sistema: string; codigo: string; descripcion?: string | null }>>;
  };
  currency?: string;
  uomOptions?: { value: string; label: string }[];
  categoryOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<string>(categoryOptions[0]?.value || "");
  const [uom, setUom] = useState(uomOptions[0]?.value || "pz");
  const [costo, setCosto] = useState<number | "">(0);
  const [stockMinimo, setStockMinimo] = useState<number | "">("");
  const [material, setMaterial] = useState("");
  const [milimetros, setMilimetros] = useState<number | "">("");
  const [pulgadas, setPulgadas] = useState<number | "">("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, start] = useTransition();
  const [loadingCodes, setLoadingCodes] = useState(false);
  
  // Códigos equivalentes - manejo más sofisticado para edición
  const [eqCodes, setEqCodes] = useState<EquivalentCode[]>([]);

  // Inicializar formulario cuando cambia el producto
  useEffect(() => {
    if (product && open) {
      setNombre(product.nombre);
      setCategoria(product.categoria);
      setUom(product.uom);
      setCosto(product.costo);
      setStockMinimo(product.stockMinimo ?? "");
      setMaterial(product.material ?? "");
      setMilimetros(product.milimetros ? Number(product.milimetros) : "");
      setPulgadas(product.pulgadas ? Number(product.pulgadas) : "");
      setErrors({});

      // Cargar códigos equivalentes automáticamente
      const loadEquivalentCodes = async () => {
        setLoadingCodes(true);
        try {
          const codes = await actions.getProductEquivalentCodes(product.sku);
          const existingCodes: EquivalentCode[] = codes.map(eq => ({
            id: eq.id,
            sistema: eq.sistema,
            codigo: eq.codigo,
            descripcion: eq.descripcion || "",
            isNew: false,
            toDelete: false,
          }));
          
          // Agregar una fila vacía para nuevos códigos
          setEqCodes([...existingCodes, { sistema: "", codigo: "", descripcion: "", isNew: true }]);
        } catch (error) {
          console.warn('Error cargando códigos equivalentes:', error);
          // En caso de error, inicializar con fila vacía
          setEqCodes([{ sistema: "", codigo: "", descripcion: "", isNew: true }]);
        } finally {
          setLoadingCodes(false);
        }
      };

      loadEquivalentCodes();
    }
  }, [product, open, actions]);

  const reset = () => {
    setNombre("");
    setCategoria(categoryOptions[0]?.value || "");
    setUom(uomOptions[0]?.value || "pz");
    setCosto(0);
    setStockMinimo("");
    setEqCodes([]);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!nombre.trim()) {
      newErrors.nombre = "El nombre del producto es obligatorio";
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    }

    if (costo !== "" && Number(costo) < 0) {
      newErrors.costo = "El costo no puede ser negativo";
    }

    if (stockMinimo !== "" && Number(stockMinimo) < 0) {
      newErrors.stockMinimo = "El stock mínimo no puede ser negativo";
    }

    // Validar códigos equivalentes
    const validEqCodes = eqCodes.filter(e => !e.toDelete && (e.sistema.trim() || e.codigo.trim()));
    for (const eq of validEqCodes) {
      if (eq.sistema.trim() && !eq.codigo.trim()) {
        newErrors.equivalentes = "Si especificas un sistema, el código es obligatorio";
        break;
      }
      if (!eq.sistema.trim() && eq.codigo.trim()) {
        newErrors.equivalentes = "Si especificas un código, el sistema es obligatorio";
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateEquivalentCode = (idx: number, field: keyof EquivalentCode, value: string | boolean) => {
    setEqCodes(prev => prev.map((eq, i) => 
      i === idx ? { ...eq, [field]: value } : eq
    ));
  };

  const addNewEquivalentRow = () => {
    setEqCodes(prev => [...prev, { sistema: "", codigo: "", descripcion: "", isNew: true }]);
  };

  const removeEquivalentRow = (idx: number) => {
    const eq = eqCodes[idx];
    if (eq.id && !eq.isNew) {
      // Marcar para eliminar en lugar de remover inmediatamente
      updateEquivalentCode(idx, 'toDelete', true);
    } else {
      // Remover fila nueva inmediatamente
      setEqCodes(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const submit = () => {
    if (!product) return;
    
    if (!validateForm()) {
      toast.error("Corrige los errores en el formulario");
      return;
    }

    start(async () => {
      try {
        // 1. Actualizar producto básico
        const fd = new FormData();
        fd.set("sku", product.sku);
        fd.set("nombre", nombre.trim());
        fd.set("categoria", categoria);
        fd.set("uom", uom);
        fd.set("costo", String(costo || 0));
        if (stockMinimo !== "") fd.set("stockMinimo", String(stockMinimo));
        if (material.trim()) fd.set("material", material.trim());
        if (milimetros !== "") fd.set("milimetros", String(Number(milimetros)));
        if (pulgadas !== "") fd.set("pulgadas", String(Number(pulgadas)));

        const updateResult = await actions.updateProduct(fd);
        if (!updateResult.ok) {
          toast.error(updateResult.message ?? "Error al actualizar el producto");
          return;
        }

        // 2. Procesar cambios en códigos equivalentes
        let eqErrors = 0;
        
        // Eliminar códigos marcados para eliminación
        for (const eq of eqCodes.filter(e => e.toDelete && e.id)) {
          const deleteFd = new FormData();
          deleteFd.set("id", eq.id!);
          const deleteResult = await actions.removeEquivalentCode(deleteFd);
          if (!deleteResult.ok) {
            console.warn("Error eliminando código equivalente:", deleteResult.message);
            eqErrors++;
          }
        }

        // Agregar nuevos códigos equivalentes
        for (const eq of eqCodes.filter(e => e.isNew && e.sistema.trim() && e.codigo.trim())) {
          const addFd = new FormData();
          addFd.set("productoId", product.sku);
          addFd.set("sistema", eq.sistema.trim());
          addFd.set("codigo", eq.codigo.trim());
          if (eq.descripcion?.trim()) addFd.set("descripcion", eq.descripcion.trim());
          
          const addResult = await actions.addEquivalentCode(addFd);
          if (!addResult.ok) {
            console.warn("Error agregando código equivalente:", addResult.message);
            eqErrors++;
          }
        }

        const successMsg = eqErrors > 0 
          ? `Producto actualizado con ${eqErrors} errores en códigos equivalentes`
          : updateResult.message ?? "Producto actualizado exitosamente";
          
        onSuccess(successMsg);
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        console.error("Error actualizando producto:", error);
        toast.error("Error inesperado al actualizar el producto");
      }
    });
  };

  const handleOpenChange = (o: boolean) => {
    if (!pending) {
      if (!o) reset();
      onOpenChange(o);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/30 shadow-sm">
              <Edit className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">Editar producto</DialogTitle>
              <DialogDescription className="text-sm mt-1.5">
                <span className="font-mono text-primary font-semibold">{product?.sku}</span> - Modifica los datos del producto
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />
        
        <div className="space-y-6">
          {/* SKU - Solo mostrar, no editable */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue/5 to-blue/0 border-2 border-blue/20 shadow-sm">
            <Label className="text-sm font-medium text-muted-foreground">🆔 SKU (no editable)</Label>
            <div className="font-mono text-xl font-bold text-primary mt-2 px-3 py-2 bg-background/60 rounded-lg border border-border/50">{product?.sku}</div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-blue/5 to-blue/0 border-2 border-blue/20 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue/20 ring-2 ring-blue/30">
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
                  placeholder="Descripción clara y concisa del producto"
                  className={`transition-all ${errors.nombre ? "border-red-500 bg-red-50/50 focus:ring-red-200" : "focus:ring-blue/20"}`}
                  maxLength={100}
                />
                {errors.nombre && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2.5 rounded-lg border border-red-200/50">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.nombre}
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground/80">Aparecerá en reportes y listados</span>
                  <span className={`font-semibold transition-colors ${nombre.length > 90 ? "text-amber-600" : "text-muted-foreground/60"}`}>{nombre.length}/100</span>
                </div>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-sm">
                  Categoría *
                </Label>
                <Select 
                  value={categoria} 
                  onValueChange={setCategoria}
                >
                  <SelectTrigger id="categoria">
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
                    {uomOptions.map(um => (
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
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/0 border-2 border-green-500/20 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/20 ring-2 ring-green-500/30">
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
                    className={`pl-8 text-right font-mono transition-all ${errors.costo ? "border-red-500 bg-red-50/50 focus:ring-red-200" : "focus:ring-green-500/20"}`}
                  />
                </div>
                {errors.costo && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2.5 rounded-lg border border-red-200/50">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.costo}
                  </div>
                )}
                <p className="text-xs text-muted-foreground/80">
                  Para valorización de inventario
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
                  className={`transition-all font-mono ${errors.stockMinimo ? "border-red-500 bg-red-50/50 focus:ring-red-200" : "focus:ring-green-500/20"}`}
                />
                {errors.stockMinimo && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2.5 rounded-lg border border-red-200/50">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.stockMinimo}
                  </div>
                )}
                <p className="text-xs text-muted-foreground/80">
                  Genera alerta cuando cae por debajo
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Measurement Information */}
          <div className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-500/0 border-2 border-amber-500/20 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/20 ring-2 ring-amber-500/30">
                <Ruler className="h-4 w-4 text-amber-600" />
              </div>
              <Label className="text-base font-semibold">Especificaciones de medida</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material" className="text-sm font-medium">
                  Material (opcional)
                </Label>
                <Input
                  id="material"
                  type="text"
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                  placeholder="Ej: Acero, Aluminio..."
                  maxLength={100}
                  className="transition-all focus:ring-amber-500/20"
                />
                <p className="text-xs text-muted-foreground/80">
                  Tipo de material
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="milimetros" className="text-sm font-medium">
                  Milímetros (opcional)
                </Label>
                <Input
                  id="milimetros"
                  type="number"
                  step="0.001"
                  min="0"
                  value={milimetros}
                  onChange={e => setMilimetros(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.000"
                  className="text-right font-mono transition-all focus:ring-amber-500/20"
                />
                <p className="text-xs text-muted-foreground/80">
                  Medida en mm
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pulgadas" className="text-sm font-medium">
                  Pulgadas (opcional)
                </Label>
                <FractionInput
                  value={pulgadas}
                  onChange={setPulgadas}
                  placeholder="Ej: 1/2, 1 1/4"
                />
                <p className="text-xs text-muted-foreground/80">
                  Medida en pulgadas (1/2, 3/4, etc.)</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Equivalent Codes */}
          <div className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/0 border-2 border-purple-500/20 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/20 ring-2 ring-purple-500/30">
                <Link2 className="h-4 w-4 text-purple-600" />
              </div>
              <Label className="text-base font-semibold">Códigos equivalentes</Label>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground/80">Vincula con sistemas externos (SAP, Odoo, etc.)</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewEquivalentRow}
                disabled={eqCodes.length >= 10}
                className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
              >
                + Agregar
              </Button>
            </div>
            
            <div className="grid gap-3">
              {loadingCodes ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Cargando códigos equivalentes...
                </div>
              ) : eqCodes.length > 0 ? (
                eqCodes.map((eq, idx) => (
                  <div 
                    key={idx} 
                    className={`grid grid-cols-1 md:grid-cols-3 gap-2 p-3.5 rounded-lg border transition-all ${eq.toDelete ? 'bg-red-50/60 border-red-200/50 opacity-60' : eq.isNew ? 'bg-purple-50/60 border-purple-200/50' : 'bg-background border-border/50'}`}
                  >
                    <Input
                      placeholder="Sistema (SAP, Odoo, ERP...)"
                      value={eq.sistema}
                      disabled={eq.toDelete}
                      onChange={e => updateEquivalentCode(idx, 'sistema', e.target.value)}
                      className={`transition-all font-semibold text-sm ${errors.equivalentes ? "border-red-500" : "focus:ring-purple-500/20"}`}
                    />
                    <Input
                      placeholder="Código"
                      value={eq.codigo}
                      disabled={eq.toDelete}
                      onChange={e => updateEquivalentCode(idx, 'codigo', e.target.value)}
                      className={`transition-all font-mono text-sm ${errors.equivalentes ? "border-red-500" : "focus:ring-purple-500/20"}`}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Descripción (opt.)"
                        value={eq.descripcion || ""}
                        disabled={eq.toDelete}
                        onChange={e => updateEquivalentCode(idx, 'descripcion', e.target.value)}
                        className="transition-all text-sm focus:ring-purple-500/20"
                      />
                      <Button
                        type="button"
                        variant={eq.toDelete ? "default" : "ghost"}
                        size="sm"
                        onClick={() => 
                          eq.toDelete 
                            ? updateEquivalentCode(idx, 'toDelete', false)
                            : removeEquivalentRow(idx)
                        }
                        title={eq.toDelete ? "Restaurar" : "Eliminar"}
                        className={eq.toDelete ? "bg-red-600 hover:bg-red-700 text-white" : "hover:bg-red-50"}
                      >
                        {eq.toDelete ? "↶" : <Trash2 className="h-4 w-4 text-red-600" />}
                      </Button>
                    </div>
                    
                    <div className="md:col-span-3 flex gap-2">
                      {eq.toDelete && <span className="text-xs text-red-600 bg-red-50/50 px-2 py-1 rounded">Será eliminado</span>}
                      {eq.isNew && eq.sistema && eq.codigo && <span className="text-xs text-purple-600 bg-purple-50/50 px-2 py-1 rounded">Será agregado</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground/60 italic text-center py-4">
                  No hay códigos. Agrega uno para vincular con sistemas externos.
                </p>
              )}
              
              {errors.equivalentes && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50/50 p-2.5 rounded-lg border border-red-200/50">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errors.equivalentes}
                </div>
              )}
            </div>
          </div>

          {/* Current Stock Info */}
          <Separator />

          <div className="p-5 rounded-xl bg-gradient-to-br from-slate-500/5 to-slate-500/0 border-2 border-slate-500/20 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-slate-500/20 ring-2 ring-slate-500/30">
                <Info className="h-4 w-4 text-slate-600" />
              </div>
              <Label className="text-base font-semibold">Información actual</Label>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <p className="text-xs text-muted-foreground/80 font-medium mb-1">Stock actual</p>
                <p className="text-lg font-bold text-primary">{product.stock} <span className="text-sm text-muted-foreground font-normal">{product.uom}</span></p>
              </div>
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <p className="text-xs text-muted-foreground/80 font-medium mb-1">Valor en inventario</p>
                <p className="text-lg font-bold text-green-600">{currency === "USD" ? "$" : "S/"}{product.stockValue.toFixed(2)}</p>
              </div>
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
            disabled={pending || !nombre.trim()} 
            onClick={submit}
            className="flex-1 sm:flex-none"
          >
            {pending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Actualizando...
              </>
            ) : (
              "Actualizar producto"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}