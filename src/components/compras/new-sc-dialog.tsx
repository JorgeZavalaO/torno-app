"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OTSelect from "@/components/cotizador/ot-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingCart, Package, Calculator, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "./types";

export function NewSCDialog({ products, onCreate }: { products: Product[]; onCreate: (payload: { otId?: string; notas?: string; items: Array<{ productoId: string; cantidad: number; costoEstimado?: number | null }> }) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Array<{ productoId: string; cantidad: number; costoEstimado?: number | null }>>([]);
  const [otId, setOtId] = useState("");
  const [ots, setOts] = useState<Array<{ id: string; codigo: string }>>([]);
  const [notas, setNotas] = useState("");

  const addRow = () => {
    if (products.length === 0) {
      toast.error("No hay productos disponibles");
      return;
    }
    setRows((r) => [...r, { productoId: products[0]?.sku ?? "", cantidad: 1, costoEstimado: null }]);
  };

  const setRow = (i: number, patch: Partial<(typeof rows)[number]>) => 
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const totalEst = useMemo(() => 
    rows.reduce((acc, r) => acc + Number(r.costoEstimado ?? 0) * Number(r.cantidad || 0), 0), 
    [rows]
  );
  
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "PEN" }).format(n);

  // Validaciones
  const hasValidItems = rows.length > 0 && rows.every(r => r.productoId && r.cantidad > 0);
  const duplicateProducts = useMemo(() => {
    const counts = rows.reduce((acc, r) => {
      acc[r.productoId] = (acc[r.productoId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(counts).filter(k => counts[k] > 1);
  }, [rows]);

  // Atajos de teclado mejorados
  const handleCreate = useCallback(async () => {
    if (!hasValidItems) {
      toast.error("Agrega al menos un ítem válido");
      return;
    }
    
    if (duplicateProducts.length > 0) {
      toast.error("Hay productos duplicados en la lista");
      return;
    }

    setLoading(true);
    try {
      await onCreate({ 
        otId: otId || undefined, 
        notas: notas.trim() || undefined, 
        items: rows 
      });
      
      // Reset form
      setOpen(false);
      setRows([]);
      setOtId("");
      setNotas("");
      toast.success("Solicitud de compra creada exitosamente");
    } catch (error) {
      toast.error("Error al crear la solicitud");
      console.error("Error creating SC:", error);
    } finally {
      setLoading(false);
    }
  }, [hasValidItems, duplicateProducts.length, onCreate, otId, notas, rows]);
  
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        setOpen(false);
      }
      if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) && hasValidItems && !loading) {
        e.preventDefault();
        handleCreate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasValidItems, loading, handleCreate]);

  // Cargar OTs para el selector
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/ots?pageSize=100');
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (mounted) setOts(data.rows || []);
      } catch {
        // no crítico
      }
    })();
    return () => { mounted = false; };
  }, []);

  const resetForm = () => {
    setRows([]);
    setOtId("");
    setNotas("");
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!loading) {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <ShoppingCart className="h-4 w-4" /> 
          Nueva Solicitud
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-blue-600" />
            Nueva Solicitud de Compra
          </DialogTitle>
          <DialogDescription className="text-sm">
            Configura los detalles y agrega los productos necesarios. 
            <kbd className="ml-2 px-1 py-0.5 text-xs bg-muted rounded">Ctrl+Enter</kbd> para crear
          </DialogDescription>
        </DialogHeader>

        {/* Información general */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ot-select" className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Orden de Trabajo (opcional)
                </Label>
                <OTSelect 
                  value={otId} 
                  onChange={setOtId} 
                  options={ots} 
                  disabled={loading} 
                />
                {otId && (
                  <p className="text-xs text-muted-foreground">
                    Vinculada a OT: {ots.find(o => o.id === otId)?.codigo}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notas" className="text-sm font-medium">
                  Notas / Justificación
                </Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Describe el motivo de la solicitud..."
                  className="min-h-[60px] resize-none"
                  disabled={loading}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {notas.length}/500
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de productos */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos Solicitados
              {rows.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {rows.length} {rows.length === 1 ? 'ítem' : 'ítems'}
                </Badge>
              )}
            </h3>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addRow} 
              disabled={loading || products.length === 0}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> 
              Agregar Producto
            </Button>
          </div>

          {duplicateProducts.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                ⚠️ Productos duplicados detectados. Considera combinar las cantidades.
              </p>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-muted/50 px-4 py-2 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground">
              <div className="col-span-5">Producto</div>
              <div className="col-span-2">Cantidad</div>
              <div className="col-span-3">Costo Est. (S/)</div>
              <div className="col-span-2">Subtotal</div>
            </div>
            
            {/* Contenido con scroll */}
            <div className="max-h-[300px] overflow-y-auto">
              {rows.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay productos agregados</p>
                  <p className="text-xs mt-1">Haz clic en &quot;Agregar Producto&quot; para comenzar</p>
                </div>
              ) : (
                rows.map((row, idx) => {
                  const product = products.find((p) => p.sku === row.productoId);
                  const subtotal = Number(row.costoEstimado ?? 0) * Number(row.cantidad || 0);
                  const isDuplicate = duplicateProducts.includes(row.productoId);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`px-4 py-3 grid grid-cols-12 gap-3 items-center border-b last:border-b-0 hover:bg-muted/25 transition-colors ${
                        isDuplicate ? 'bg-amber-50' : ''
                      }`}
                    >
                      {/* Selector de producto */}
                      <div className="col-span-5">
                        <Select 
                          value={row.productoId} 
                          onValueChange={(value) => setRow(idx, { productoId: value })}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.sku} value={p.sku}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{p.nombre}</span>
                                  <span className="text-xs text-muted-foreground">{p.sku}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {product?.uom && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Unidad: {product.uom}
                          </p>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div className="col-span-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0.001}
                          step="0.001"
                          placeholder="0"
                          value={row.cantidad || ''}
                          onChange={(e) => setRow(idx, { cantidad: Number(e.target.value) || 0 })}
                          className="h-8"
                          disabled={loading}
                        />
                      </div>

                      {/* Costo estimado */}
                      <div className="col-span-3">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={row.costoEstimado ?? ''}
                          onChange={(e) => setRow(idx, { 
                            costoEstimado: e.target.value === "" ? null : Number(e.target.value) 
                          })}
                          className="h-8"
                          disabled={loading}
                        />
                      </div>

                      {/* Subtotal y acciones */}
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {fmt(subtotal)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(idx)}
                          disabled={loading}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Resumen y acciones */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calculator className="h-4 w-4" />
              Total Estimado:
            </div>
            <div className="text-xl font-bold text-green-600">
              {fmt(totalEst)}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!hasValidItems || loading || duplicateProducts.length > 0}
              className="gap-2 min-w-[120px]"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Crear Solicitud
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
