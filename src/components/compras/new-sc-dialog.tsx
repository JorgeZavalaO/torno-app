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
import { Plus, Trash2, ShoppingCart, Package, Calculator, FileText, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "./types";

export function NewSCDialog({ products, onCreate, monedaOptions, defaultCurrency }: { products: Product[]; onCreate: (payload: { otId?: string; notas?: string; items: Array<{ productoId: string; cantidad: number; costoEstimado?: number | null }>; currency?: string }) => Promise<void> | void; monedaOptions: { value: string; label: string; color?: string | null }[]; defaultCurrency?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Array<{ productoId: string; cantidad: number; costoEstimado?: number | null }>>([]);
  const [otId, setOtId] = useState("");
  const [ots, setOts] = useState<Array<{ id: string; codigo: string }>>([]);
  const [notas, setNotas] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency || (monedaOptions[0]?.value || "PEN"));

  const currencySymbol = useMemo(() => {
    const map: Record<string, string> = { PEN: "S/", USD: "$", EUR: "€" };
    return map[currency] || currency;
  }, [currency]);

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
  
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "PEN" }).format(n);

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
        items: rows,
        currency,
      });
      
      // Reset form
      setOpen(false);
      setRows([]);
      setOtId("");
      setNotas("");
      setCurrency(defaultCurrency || (monedaOptions[0]?.value || "PEN"));
      toast.success("Solicitud de compra creada exitosamente");
    } catch (error) {
      toast.error("Error al crear la solicitud");
      console.error("Error creating SC:", error);
    } finally {
      setLoading(false);
    }
  }, [hasValidItems, duplicateProducts.length, onCreate, otId, notas, rows, currency, defaultCurrency, monedaOptions]);
  
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
    setCurrency(defaultCurrency || (monedaOptions[0]?.value || "PEN"));
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
        <Card className="mb-4 border-0 bg-gradient-to-br from-blue-50 to-blue-50/30 dark:from-slate-800 dark:to-slate-900">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* OT Selection */}
              <div className="space-y-2.5">
                <Label htmlFor="ot-select" className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Orden de Trabajo
                </Label>
                <div className="relative">
                  <OTSelect 
                    value={otId} 
                    onChange={setOtId} 
                    options={ots} 
                    disabled={loading} 
                  />
                </div>
                {otId ? (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <p className="text-xs font-medium text-green-700 dark:text-green-300">
                      Vinculada: {ots.find(o => o.id === otId)?.codigo}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Opcional. Vincula a una orden de trabajo.</p>
                )}
              </div>
              
              {/* Notas */}
              <div className="space-y-2.5">
                <Label htmlFor="notas" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Notas / Justificación
                </Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="¿Por qué se necesitan estos productos?"
                  className="min-h-[78px] resize-none text-sm bg-white dark:bg-slate-700"
                  disabled={loading}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {notas.length > 400 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {500 - notas.length} caracteres restantes
                      </span>
                    ) : (
                      `${notas.length}/500`
                    )}
                  </p>
                </div>
              </div>
              
              {/* Moneda */}
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Moneda
                </Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v)} disabled={loading}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monedaOptions.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold w-12">{m.value}</span>
                          <span className="text-sm text-slate-500">{m.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    Todos los costos en <span className="font-bold">{currency}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de productos */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Package className="h-4 w-4 text-blue-600" />
              Productos Solicitados
              {rows.length > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 hover:bg-blue-200">
                  {rows.length} {rows.length === 1 ? 'ítem' : 'ítems'}
                </Badge>
              )}
            </h3>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addRow} 
              disabled={loading || products.length === 0}
              className="gap-2 hover:bg-blue-50 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 text-blue-600" /> 
              Agregar Producto
            </Button>
          </div>

          {duplicateProducts.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Productos duplicados:</span> considera combinar cantidades para optimizar la orden.
              </p>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden flex-1 flex flex-col bg-white dark:bg-slate-800">
            {/* Header */}
            <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 grid grid-cols-12 gap-3 text-xs font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 sticky top-0">
              <div className="col-span-5">Producto</div>
              <div className="col-span-2">Cantidad</div>
              <div className="col-span-3">Costo Est. ({currencySymbol})</div>
              <div className="col-span-2">Subtotal</div>
            </div>
            
            {/* Contenido con scroll */}
            <div className="overflow-y-auto flex-1">
              {rows.length === 0 ? (
                <div className="flex items-center justify-center h-full p-8 text-center">
                  <div>
                    <Package className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No hay productos agregados</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Haz clic en &quot;Agregar Producto&quot; para comenzar</p>
                  </div>
                </div>
              ) : (
                rows.map((row, idx) => {
                  const product = products.find((p) => p.sku === row.productoId);
                  const subtotal = Number(row.costoEstimado ?? 0) * Number(row.cantidad || 0);
                  const isDuplicate = duplicateProducts.includes(row.productoId);
                  const isValid = row.productoId && row.cantidad > 0;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`px-4 py-3 grid grid-cols-12 gap-3 items-center border-b last:border-b-0 transition-colors ${
                        isDuplicate 
                          ? 'bg-amber-50 dark:bg-amber-900/10' 
                          : isValid
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          : 'bg-red-50 dark:bg-red-900/10'
                      }`}
                    >
                      {/* Selector de producto */}
                      <div className="col-span-5">
                        <Select 
                          value={row.productoId} 
                          onValueChange={(value) => setRow(idx, { productoId: value })}
                          disabled={loading}
                        >
                          <SelectTrigger className={`h-8 text-sm ${!row.productoId ? 'text-slate-400' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.sku} value={p.sku}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium text-sm">{p.nombre}</span>
                                  <span className="text-xs text-slate-500">{p.sku}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {product?.uom && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            ▸ {product.uom}
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
                          className={`h-8 text-sm ${row.cantidad <= 0 ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-600'}`}
                          disabled={loading}
                        />
                      </div>

                      {/* Costo estimado */}
                      <div className="col-span-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {currencySymbol}
                          </span>
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
                            className="h-8 pl-7 text-sm border-slate-200 dark:border-slate-600"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* Subtotal y acciones */}
                      <div className="col-span-2 flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold tabular-nums ${
                          subtotal > 0 
                            ? 'text-green-700 dark:text-green-400' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {fmt(subtotal)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(idx)}
                          disabled={loading}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Total Estimado
                </span>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 tabular-nums">
                  {fmt(totalEst)}
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {rows.length} {rows.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>
            </div>
            
            {/* Detalles del total */}
            {rows.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Cantidad total:</span>
                  <span className="font-semibold">{rows.reduce((s, r) => s + Number(r.cantidad || 0), 0)} unidades</span>
                </div>
                {rows.filter(r => !r.costoEstimado).length > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>⚠ Sin costo definido:</span>
                    <span className="font-semibold">{rows.filter(r => !r.costoEstimado).length} ítem(s)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!hasValidItems || loading || duplicateProducts.length > 0}
              className="gap-2 min-w-[140px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
