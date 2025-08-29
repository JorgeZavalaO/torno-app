"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Package, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface PiezaLine {
  productoId?: string;
  descripcion: string;
  qty: number;
}

export interface MaterialLine {
  productoId?: string;
  descripcion: string;
  qty: number;
  unitCost: number;
}

interface QuoteLinesEditorProps {
  piezasLines: PiezaLine[];
  setPiezasLines: (v: PiezaLine[]) => void;
  materialesLines: MaterialLine[];
  setMaterialesLines: (v: MaterialLine[]) => void;
  currency: string;
  disabled?: boolean;
}

export function QuoteLinesEditor({
  piezasLines,
  setPiezasLines,
  materialesLines,
  setMaterialesLines,
  currency,
  disabled,
}: QuoteLinesEditorProps) {
  const addPieza = () => setPiezasLines([...piezasLines, { descripcion: "", qty: 1 }]);
  const updatePieza = (idx: number, patch: Partial<PiezaLine>) => {
    const copy = [...piezasLines];
    copy[idx] = { ...copy[idx], ...patch };
    setPiezasLines(copy);
  };
  const removePieza = (idx: number) => {
    const copy = [...piezasLines];
    copy.splice(idx, 1);
    setPiezasLines(copy);
  };

  const addMaterial = () => setMaterialesLines([...materialesLines, { descripcion: "", qty: 1, unitCost: 0 }]);
  const updateMaterial = (idx: number, patch: Partial<MaterialLine>) => {
    const copy = [...materialesLines];
    copy[idx] = { ...copy[idx], ...patch };
    setMaterialesLines(copy);
  };
  const removeMaterial = (idx: number) => {
    const copy = [...materialesLines];
    copy.splice(idx, 1);
    setMaterialesLines(copy);
  };

  const totalMaterials = materialesLines.reduce((s, m) => s + m.qty * m.unitCost, 0);
  const totalQty = piezasLines.reduce((s, p) => s + p.qty, 0);

  // inventory options (sku, nombre, uom, lastCost, stock)
  const [inventory, setInventory] = useState<{ sku: string; nombre: string; categoria?: string; uom: string; lastCost: number; stock?: number }[]>([]);
  const [searchPieza, setSearchPieza] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/inventory/products")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.ok && Array.isArray(data.products)) setInventory(data.products);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const onSelectProductForMaterial = async (idx: number, sku?: string) => {
    if (!sku) return updateMaterial(idx, { productoId: undefined });
    const prod = inventory.find((p) => p.sku === sku);
    if (!prod) return;
    try {
      const r = await fetch(`/api/inventory/stock/${encodeURIComponent(sku)}`);
      const data = await r.json();
      if (data?.ok) {
        const stock = Number(data.stock || 0);
        const line = materialesLines[idx];
        const intendedQty = line ? line.qty : 1;
        if (intendedQty > stock) toast.warning(`Stock insuficiente para ${sku}. Stock: ${stock}, requerido: ${intendedQty}`);
      }
    } catch {}
    updateMaterial(idx, { productoId: sku, descripcion: prod.nombre, unitCost: prod.lastCost });
  };

  const onSelectProductForPieza = (idx: number, sku?: string) => {
    if (!sku) return updatePieza(idx, { productoId: undefined });
    const prod = inventory.find((p) => p.sku === sku);
    if (!prod) return;
    updatePieza(idx, { productoId: sku, descripcion: prod.nombre });
  };

  const filteredInventoryPiezas = useMemo(() => {
    // Solo productos de categoría FABRICACION
    const base = inventory.filter((p) => (p.categoria ?? "").toUpperCase() === "FABRICACION");
    if (!searchPieza.trim()) return base;
    const q = searchPieza.toLowerCase();
    return base.filter((p) => p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q));
  }, [inventory, searchPieza]);

  const filteredInventoryMateriales = useMemo(() => {
    // Todas las categorías excepto FABRICACION
    const base = inventory.filter((p) => (p.categoria ?? "").toUpperCase() !== "FABRICACION");
    if (!searchMaterial.trim()) return base;
    const q = searchMaterial.toLowerCase();
    return base.filter((p) => p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q));
  }, [inventory, searchMaterial]);

  const checkMaterialQtyStock = async (idx: number, newQty: number) => {
    const line = materialesLines[idx];
    if (!line?.productoId) return;
    try {
      const r = await fetch(`/api/inventory/stock/${encodeURIComponent(line.productoId)}`);
      const data = await r.json();
      if (data?.ok) {
        const stock = Number(data.stock || 0);
        if (newQty > stock) toast.warning(`Stock insuficiente para ${line.productoId}. Stock: ${stock}, requerido: ${newQty}`);
      }
    } catch {}
  };

  // Column templates para alinear headers y filas
  const PIEZAS_COLS = "grid-cols-[180px_1fr_120px_80px]"; // SKU | Descripción | Cantidad | Acciones
  const MATERIALES_COLS = "grid-cols-[180px_1fr_120px_140px_130px]"; // SKU | Descripción | Cant | Costo | Total/Acc.

  return (
    <div className="space-y-6">
      {/* Sección de Piezas */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Detalle de Piezas</h3>
              <p className="text-sm text-muted-foreground">
                {piezasLines.length === 0
                  ? "Agrega piezas para calcular automáticamente la cantidad total"
                  : `${piezasLines.length} pieza${piezasLines.length !== 1 ? "s" : ""} • Total: ${totalQty} unidades`}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPieza} disabled={disabled} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar pieza
          </Button>
        </div>

        {piezasLines.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">No hay piezas detalladas. Puedes ingresar una cantidad manual o agregar piezas específicas.</p>
            <Button type="button" variant="outline" onClick={addPieza} disabled={disabled} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar primera pieza
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className={`grid ${PIEZAS_COLS} gap-3 text-xs font-medium text-muted-foreground px-2 py-1 bg-slate-50 rounded`}>
              <div>Producto / Descripción</div>
              <div />
              <div>Cantidad</div>
              <div className="text-right">Acciones</div>
            </div>

            {/* Filas */}
            {piezasLines.map((p, idx) => {
              const inv = p.productoId ? inventory.find((i) => i.sku === p.productoId) : undefined;
              const stock = inv?.stock ?? null;
              const insufficient = stock != null && p.qty > stock;
              return (
                <div key={idx} className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                  {/* Fila principal */}
                  <div className={`grid ${PIEZAS_COLS} gap-3 items-center p-3 ${insufficient ? "border-b border-red-200 bg-red-50/40" : ""}`}>
                    {/* SKU */}
                    <div className="w-[180px]">
                      <Select value={p.productoId || ""} onValueChange={(v: string) => onSelectProductForPieza(idx, v || undefined)} disabled={disabled}>
                        <SelectTrigger className="h-10 w-full truncate">
                          <SelectValue placeholder="Seleccionar SKU..." />
                        </SelectTrigger>
                        <SelectContent className="z-50 w-[24rem] max-w-[90vw]">
                          <div className="p-2">
                            <div className="relative mb-2">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Buscar SKU o nombre..." value={searchPieza} onChange={(e) => setSearchPieza(e.target.value)} className="pl-8 h-9" />
                            </div>
                            <div className="max-h-52 overflow-auto">
                              {filteredInventoryPiezas.map((inv) => (
                                <SelectItem key={inv.sku} value={inv.sku} className="flex-col items-start gap-1">
                                  <div className="font-medium truncate">{inv.sku}</div>
                                  <div className="text-xs text-muted-foreground truncate">{inv.nombre}</div>
                                </SelectItem>
                              ))}
                              {filteredInventoryPiezas.length === 0 && <div className="p-3 text-sm text-muted-foreground text-center">No hay coincidencias</div>}
                            </div>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Descripción */}
                    <Input
                      placeholder="Descripción de la pieza"
                      value={p.descripcion}
                      onChange={(e) => updatePieza(idx, { descripcion: e.target.value })}
                      disabled={disabled}
                      className="h-10"
                    />

                    {/* Cantidad */}
                    <Input
                      type="number"
                      min={1}
                      value={p.qty}
                      onChange={(e) => updatePieza(idx, { qty: Math.max(1, Number(e.target.value)) })}
                      disabled={disabled}
                      className="h-10"
                    />

                    {/* Acciones */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePieza(idx)}
                        disabled={disabled}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Subfila de stock (altura fija para no romper la grilla) */}
                  {stock != null && (
                    <div className="px-3 pb-3">
                      <div className="min-h-[1.25rem] flex items-center gap-2 text-xs">
                        {insufficient ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle className="h-3 w-3 text-green-500" />}
                        <span className={insufficient ? "text-red-600" : "text-green-600"}>
                          Stock disponible: {stock}
                          {insufficient && ` (insuficiente para ${p.qty})`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-800 font-medium">Cantidad total calculada:</span>
                <span className="text-blue-900 font-bold text-lg">{totalQty} unidades</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Sección de Materiales */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Detalle de Materiales</h3>
              <p className="text-sm text-muted-foreground">
                {materialesLines.length === 0
                  ? "Agrega materiales para calcular automáticamente el costo total"
                  : `${materialesLines.length} material${materialesLines.length !== 1 ? "es" : ""} • Total: ${totalMaterials.toFixed(2)} ${currency}`}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addMaterial} disabled={disabled} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar material
          </Button>
        </div>

        {materialesLines.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">No hay materiales detallados. Puedes ingresar el costo total manual o agregar materiales específicos.</p>
            <Button type="button" variant="outline" onClick={addMaterial} disabled={disabled} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar primer material
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className={`grid ${MATERIALES_COLS} gap-3 text-xs font-medium text-muted-foreground px-2 py-1 bg-slate-50 rounded`}>
              <div>Producto / Descripción</div>
              <div />
              <div>Cantidad</div>
              <div>Costo Unit. ({currency})</div>
              <div className="text-right">Total / Acciones</div>
            </div>

            {/* Filas */}
            {materialesLines.map((m, idx) => {
              const inv = m.productoId ? inventory.find((i) => i.sku === m.productoId) : undefined;
              const stock = inv?.stock ?? null;
              const insufficient = stock != null && m.qty > stock;
              const lineTotal = m.qty * m.unitCost;
              return (
                <div key={idx} className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                  {/* Fila principal */}
                  <div className={`grid ${MATERIALES_COLS} gap-3 items-center p-3 ${insufficient ? "border-b border-red-200 bg-red-50/40" : ""}`}>
                    {/* SKU */}
                    <div className="w-[180px]">
                      <Select value={m.productoId || ""} onValueChange={(v) => onSelectProductForMaterial(idx, v || undefined)} disabled={disabled}>
                        <SelectTrigger className="h-10 w-full truncate">
                          <SelectValue placeholder="Seleccionar SKU..." />
                        </SelectTrigger>
                        <SelectContent className="z-50 w-[24rem] max-w-[90vw]">
                          <div className="p-2">
                            <div className="relative mb-2">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar SKU o nombre..."
                                value={searchMaterial}
                                onChange={(e) => setSearchMaterial(e.target.value)}
                                className="pl-8 h-9"
                              />
                            </div>
                            <div className="max-h-52 overflow-auto">
                              {filteredInventoryMateriales.map((inv) => (
                                <SelectItem key={inv.sku} value={inv.sku} className="flex-col items-start gap-1">
                                  <div className="font-medium truncate">{inv.sku}</div>
                                  <div className="text-xs text-muted-foreground truncate">{inv.nombre}</div>
                                </SelectItem>
                              ))}
                              {filteredInventoryMateriales.length === 0 && <div className="p-3 text-sm text-muted-foreground text-center">No hay coincidencias</div>}
                            </div>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Descripción */}
                    <Input
                      placeholder="Descripción del material"
                      value={m.descripcion}
                      onChange={(e) => updateMaterial(idx, { descripcion: e.target.value })}
                      disabled={disabled}
                      className="h-10"
                    />

                    {/* Cantidad */}
                    <Input
                      type="number"
                      min={0}
                      value={m.qty}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value));
                        updateMaterial(idx, { qty: v });
                        checkMaterialQtyStock(idx, v);
                      }}
                      disabled={disabled}
                      className="h-10"
                    />

                    {/* Costo unitario */}
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={m.unitCost}
                      onChange={(e) => updateMaterial(idx, { unitCost: Math.max(0, Number(e.target.value)) })}
                      disabled={disabled}
                      className="h-10"
                    />

                    {/* Total / Acciones */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold tabular-nums">{lineTotal.toFixed(2)}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMaterial(idx)}
                        disabled={disabled}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Subfila de stock */}
                  {stock != null && (
                    <div className="px-3 pb-3">
                      <div className="min-h-[1.25rem] flex items-center gap-2 text-xs">
                        {insufficient ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle className="h-3 w-3 text-green-500" />}
                        <span className={insufficient ? "text-red-600" : "text-green-600"}>
                          Stock disponible: {stock}
                          {insufficient && ` (insuficiente para ${m.qty})`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-800 font-medium">Costo total de materiales:</span>
                <span className="text-green-900 font-bold text-lg">
                  {totalMaterials.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
