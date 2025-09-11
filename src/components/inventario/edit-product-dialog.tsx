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
import { toast } from "sonner";
import { Edit, AlertCircle, Info, Trash2 } from "lucide-react";
import { unidadesMedida } from "../../app/(protected)/inventario/uoms";
import { CATEGORIES } from "@/lib/product-categories";
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
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [uom, setUom] = useState("pz");
  const [costo, setCosto] = useState<number | "">(0);
  const [stockMinimo, setStockMinimo] = useState<number | "">("");
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
    setCategoria(CATEGORIES[0]);
    setUom("pz");
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
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Edit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Editar producto</DialogTitle>
              <DialogDescription>
                Modifica la información del producto: {product.sku}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* SKU - Solo mostrar, no editable */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium text-muted-foreground">SKU (no editable)</Label>
            <div className="font-mono text-lg font-bold">{product.sku}</div>
          </div>

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

          <Separator />

          {/* Códigos equivalentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Códigos equivalentes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewEquivalentRow}
                disabled={eqCodes.length >= 10}
              >
                Agregar código
              </Button>
            </div>
            
            <div className="grid gap-3">
              {loadingCodes ? (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Cargando códigos equivalentes...
                </div>
              ) : (
                eqCodes.map((eq, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-1 md:grid-cols-3 gap-2 p-3 rounded-lg border ${
                    eq.toDelete ? 'bg-red-50 border-red-200 opacity-50' : 
                    eq.isNew ? 'bg-green-50 border-green-200' : 
                    'bg-background'
                  }`}
                >
                  <Input
                    placeholder="Sistema (SAP, Odoo, etc.)"
                    value={eq.sistema}
                    disabled={eq.toDelete}
                    onChange={e => updateEquivalentCode(idx, 'sistema', e.target.value)}
                    className={errors.equivalentes ? "border-red-500" : ""}
                  />
                  <Input
                    placeholder="Código en el sistema"
                    value={eq.codigo}
                    disabled={eq.toDelete}
                    onChange={e => updateEquivalentCode(idx, 'codigo', e.target.value)}
                    className={errors.equivalentes ? "border-red-500" : ""}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Descripción (opcional)"
                      value={eq.descripcion || ""}
                      disabled={eq.toDelete}
                      onChange={e => updateEquivalentCode(idx, 'descripcion', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant={eq.toDelete ? "default" : "ghost"}
                      size="sm"
                      onClick={() => 
                        eq.toDelete 
                          ? updateEquivalentCode(idx, 'toDelete', false) // Restaurar
                          : removeEquivalentRow(idx) // Eliminar/marcar
                      }
                      title={eq.toDelete ? "Restaurar" : "Eliminar"}
                    >
                      {eq.toDelete ? "↶" : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Indicador de estado */}
                  <div className="md:col-span-3">
                    {eq.toDelete && (
                      <p className="text-xs text-red-600">Este código será eliminado</p>
                    )}
                    {eq.isNew && eq.sistema && eq.codigo && (
                      <p className="text-xs text-green-600">Este código será agregado</p>
                    )}
                  </div>
                </div>
              ))
              )}
              
              {errors.equivalentes && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.equivalentes}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Estos códigos permiten mapear el SKU con sistemas externos (ERP).
                Los cambios se aplicarán al guardar.
              </p>
            </div>
          </div>

          {/* Current Stock Info */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Información actual</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Stock actual:</span>
                <span className="ml-2 font-medium">{product.stock} {product.uom}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valor en inventario:</span>
                <span className="ml-2 font-medium">
                  {currency === "USD" ? "$" : "S/"}{product.stockValue.toFixed(2)}
                </span>
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