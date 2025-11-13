"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Factory, X, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Provider, SCRow } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

function EditCostsDialog({ items, onSubmit, currency }: {
  items: Array<{ id: string; label: string; costoEstimado: number|null }>;
  onSubmit: (items: Array<{ id: string; costoEstimado: number|null }>) => void | Promise<void>;
  currency?: string;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, number|string>>(
    Object.fromEntries(items.map(i => [i.id, i.costoEstimado ?? ""]))
  );

  useEffect(() => {
    setVals(Object.fromEntries(items.map(i => [i.id, i.costoEstimado ?? ""])));
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Editar costos</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <DialogTitle>Costos estimados {currency ? `(${currency})` : ""}</DialogTitle>
              <DialogDescription>
                Actualiza el costo unitario estimado por ítem{currency ? ` (moneda: ${currency})` : ""}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Ítem</th>
                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Costo Est. {currency ? `(${currency})` : ""}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900/20' : 'bg-slate-50 dark:bg-slate-900/40'} >
                  <td className="p-3 truncate text-slate-700 dark:text-slate-300" title={it.label}>{it.label}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      {currency && (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 w-12 text-right">{currency}</span>
                      )}
                      <Input
                        className="h-9 w-40 text-right"
                        type="number" inputMode="decimal" min={0} step="0.01"
                        value={vals[it.id] ?? ""} placeholder="0.00"
                        onChange={e => setVals(v => ({ ...v, [it.id]: e.target.value }))}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" onClick={() => {
            const payload = items.map(it => {
              const raw = String(vals[it.id] ?? "").trim();
              return { id: it.id, costoEstimado: raw === "" ? null : Number(raw) };
            });
            Promise.resolve(onSubmit(payload))
              .then(() => {
                toast.success("Costos enviados");
                setOpen(false);
              })
              .catch(() => {
                toast.error("No se pudieron enviar los costos");
              });
          }}><DollarSign className="h-4 w-4" />Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SCRowActions({
  row,
  canWrite,
  providers,
  onApprove,
  onCreateOC,
  onUpdateCosts,
  monedaOptions,
}: {
  row: SCRow;
  canWrite: boolean;
  providers: Provider[];
  onApprove: (next: SCRow["estado"]) => void;
  onCreateOC: (payload: {
    proveedorId: string;
    codigo: string;
    items: Array<{ productoId: string; cantidad: number; costoUnitario: number }>;
    currency?: string;
  }) => void;
  onUpdateCosts: (payload: { scId: string; items: Array<{ id: string; costoEstimado: number|null }> }) => void;
  monedaOptions?: { value: string; label: string; color?: string | null }[];
}) {
  // visible si SC es editable (mismas reglas del server)
  const editable = row.estado === "PENDING_ADMIN" || row.estado === "PENDING_GERENCIA" || ((row.ocs?.length ?? 0) === 0 && row.estado === "APPROVED");

  const hasProviders = providers.length > 0;
  const defaultCodigo = useMemo(
    () => `OC-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6)}`,
    []
  );

  // Calcular el total de items pendientes
  const hasPendingItems = useMemo(() => {
    if (typeof row.pendingTotal === "number") {
      return row.pendingTotal > 0;
    }
    // Fallback: calcular manualmente
    const totalPending = row.items.reduce((sum, item) => {
      const pending = typeof item.pendiente === "number" 
        ? item.pendiente 
        : Math.max(0, Number(item.cantidad) - Number(item.cubierto || 0));
      return sum + pending;
    }, 0);
    return totalPending > 0;
  }, [row.items, row.pendingTotal]);

  const [proveedorId, setProveedorId] = useState(hasProviders ? providers[0].id : "");
  const [currency, setCurrency] = useState<string | undefined>(() => {
    const p = providers[0];
    return p?.currency || row.currency || monedaOptions?.[0]?.value || "PEN";
  });
  const [codigo, setCodigo] = useState(defaultCodigo);
  const [open, setOpen] = useState(false);

  // Clave estable por ítem (preferimos id; si no hay, fallback)
  const makeKey = (i: SCRow["items"][number], idx: number) => i.id ?? `${i.productoId}-${idx}`;

  // Pendiente por ítem (si no llega "pendiente", calculamos con cubierto)
  const calcPend = (i: SCRow["items"][number]) => {
    if (typeof i.pendiente === "number") return Math.max(0, Number(i.pendiente));
    if (typeof i.cubierto === "number") return Math.max(0, Number(i.cantidad) - Number(i.cubierto));
    return Number(i.cantidad) || 0;
  };

  // Estado local de cantidades a ordenar por ítem
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});
  const [unitCostBySku, setUnitCostBySku] = useState<Record<string, number>>({});

  // Inicializamos cantidades por defecto = pendiente
  useEffect(() => {
    const initial: Record<string, number> = {};
    row.items.forEach((it, idx) => {
      const k = makeKey(it, idx);
      initial[k] = calcPend(it);
    });
    setQtyByKey(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  useEffect(() => {
    // agrupar por producto usando las cantidades actuales y costoEstimado por ítem
    const tmp = new Map<string, { sumCost:number; sumQty:number }>();
    row.items.forEach((i, idx) => {
      const k = makeKey(i, idx);
      const qty = Number(qtyByKey[k] || 0);
      if (qty <= 0) return;
      const est = Number(i.costoEstimado ?? 0);
      const cur = tmp.get(i.productoId) ?? { sumCost: 0, sumQty: 0 };
      cur.sumCost += est * qty; cur.sumQty += qty;
      tmp.set(i.productoId, cur);
    });
    const next: Record<string, number> = {};
    tmp.forEach((v, sku) => { next[sku] = v.sumQty > 0 ? Number((v.sumCost / v.sumQty).toFixed(2)) : 0; });
    setUnitCostBySku(prev => {
      // conservar lo que el usuario ya tocó (no lo pises si existe)
      const merged: Record<string, number> = { ...next };
      for (const [k,v] of Object.entries(prev)) if (!Number.isNaN(v) && v > 0) merged[k] = v;
      return merged;
    });
  }, [row.items, qtyByKey]);

  // Validaciones
  const anyQty = useMemo(() => Object.values(qtyByKey).some(v => Number(v) > 0), [qtyByKey]);

  const invalidExceeds = useMemo(() => {
    for (let idx = 0; idx < row.items.length; idx++) {
      const it = row.items[idx];
      const k = makeKey(it, idx);
      const pend = calcPend(it);
      const v = Number(qtyByKey[k] ?? 0);
      if (v < 0) return true;
      if (v > pend) return true;
    }
    return false;
  }, [qtyByKey, row.items]);

  const totalToOrder = useMemo(
    () => Object.values(qtyByKey).reduce((s, v) => s + Number(v || 0), 0),
    [qtyByKey]
  );

  const fillAllPending = () => {
    const next: Record<string, number> = {};
    row.items.forEach((it, idx) => {
      const k = makeKey(it, idx);
      const pend = calcPend(it);
      next[k] = pend;
    });
    setQtyByKey(next);
  };

  if (!canWrite) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {editable && (
        <EditCostsDialog
          items={row.items.map(i => ({ id: i.id!, label: `${i.nombre ?? i.productoId} (${i.uom})`, costoEstimado: i.costoEstimado ?? null }))}
          onSubmit={(items) => onUpdateCosts({ scId: row.id, items })}
          currency={row.currency}
        />
      )}
      {row.estado === "PENDING_ADMIN" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onApprove("PENDING_GERENCIA")}
            className="gap-1"
          >
            <Factory className="h-3 w-3" /> Enviar a Gerencia
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onApprove("REJECTED")}
            className="gap-1"
          >
            <X className="h-3 w-3" /> Rechazar
          </Button>
        </>
      )}

      {row.estado === "PENDING_GERENCIA" && (
        <>
          <Button size="sm" onClick={() => onApprove("APPROVED")} className="gap-1">
            <Check className="h-3 w-3" /> Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onApprove("REJECTED")}
            className="gap-1"
          >
            <X className="h-3 w-3" /> Rechazar
          </Button>
        </>
      )}

      {row.estado === "APPROVED" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={!hasProviders || !hasPendingItems}
              title={
                !hasProviders 
                  ? "Primero registra un proveedor" 
                  : !hasPendingItems 
                  ? "No hay items pendientes para crear OC" 
                  : ""
              }
            >
              Crear OC
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[820px]">
            <DialogHeader>
              <DialogTitle>Crear Orden de Compra</DialogTitle>
              <DialogDescription>
                Asigna cantidades por ítem (por defecto igual al pendiente). Luego se agrupan por producto.
              </DialogDescription>
            </DialogHeader>

            {!hasProviders ? (
              <div className="text-sm text-red-600">
                No hay proveedores. Crea uno antes de generar la OC.
              </div>
            ) : (
              <>
                {/* Encabezado proveedor / código */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                    <div className="text-sm text-muted-foreground mb-1">Proveedor</div>
                    <select
                      className="border rounded-md h-9 px-2 w-full"
                      value={proveedorId}
                      onChange={(e) => setProveedorId(e.target.value)}
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {p.ruc} {p.currency ? `(${p.currency})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Código</div>
                    <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                  </div>
                    {monedaOptions && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Moneda OC</div>
                        <select
                          className="border rounded-md h-9 px-2 w-full"
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                        >
                          {monedaOptions.map(m => <option key={m.value} value={m.value}>{m.value} — {m.label}</option>)}
                        </select>
                      </div>
                    )}
                </div>

                {/* Resumen rápido */}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <div>
                    Ítems: {row.items.length} • A ordenar ahora: {totalToOrder}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={fillAllPending}>
                      Rellenar todo pendiente
                    </Button>
                  </div>
                </div>

                {/* Tabla de ítems con pendiente y cantidad a ordenar */}
                <div className="max-h-[45vh] overflow-auto rounded-md border mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Pedido</th>
                        <th className="text-right p-2">Cubierto</th>
                        <th className="text-right p-2">Pendiente</th>
                        <th className="text-right p-2">Ordenar</th>
                        <th className="text-right p-2">Costo Unit. (est.) {row.currency ? `(${row.currency})` : ""}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.items.map((i, idx) => {
                        const k = makeKey(i, idx);
                        const pendiente = calcPend(i);
                        const cubierto = typeof i.cubierto === "number" ? i.cubierto : (Number(i.cantidad) - pendiente);
                        return (
                          <tr key={k}>
                            <td className="p-2">
                              <div className="truncate" title={`${i.nombre ?? i.productoId} — ${i.productoId}`}>
                                {i.nombre ?? i.productoId}
                              </div>
                              <div className="text-xxs text-muted-foreground font-mono">{i.productoId}</div>
                            </td>
                            <td className="p-2 text-right">{i.cantidad} {i.uom}</td>
                            <td className="p-2 text-right">{Number(cubierto)}</td>
                            <td className="p-2 text-right">{pendiente}</td>
                            <td className="p-2 text-right">
                              <Input
                                className="h-8"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={pendiente}
                                step="0.001"
                                value={qtyByKey[k] ?? 0}
                                onChange={(e) => setQtyByKey((m) => ({
                                  ...m,
                                  [k]: e.target.value === "" ? 0 : Number(e.target.value)
                                }))}
                              />
                            </td>
                            <td className="p-2 text-right">
                              {i.costoEstimado != null
                                ? Number(i.costoEstimado).toFixed(2)
                                : "0.00"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tabla para ajustar costo unitario final por SKU */}
                <div className="rounded-md border mt-3">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Costo Unitario (final) {currency ? `(OC: ${currency})` : ""}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(row.items.map(i => i.productoId))).map(sku => {
                        const anyQty = row.items.some((i, idx) => (qtyByKey[makeKey(i, idx)] || 0) > 0 && i.productoId === sku);
                        if (!anyQty) return null;
                        const label = row.items.find(i => i.productoId === sku)?.nombre ?? sku;
                        return (
                          <tr key={sku}>
                            <td className="p-2 truncate" title={`${label} — ${sku}`}>{label} <span className="text-xxs text-muted-foreground font-mono">({sku})</span></td>
                            <td className="p-2 text-right">
                              <Input
                                className="h-8"
                                type="number" inputMode="decimal" min={0} step="0.01"
                                value={unitCostBySku[sku] ?? 0}
                                onChange={e => setUnitCostBySku(m => ({ ...m, [sku]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer con validaciones */}
                <div className="flex items-center justify-between pt-3">
                  <div className="text-xs">
                    {invalidExceeds && (
                      <span className="text-red-600">Hay cantidades inválidas (negativas o mayores al pendiente).</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total a ordenar: <span className="font-medium">{totalToOrder}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (!proveedorId) return;
                      if (invalidExceeds) return;

                      // Construir payload agrupado por producto
                      type Tmp = { qty: number; sumCost: number; sumQtyForAvg: number };
                      const acc = new Map<string, Tmp>();

                      row.items.forEach((i, idx) => {
                        const k = makeKey(i, idx);
                        const qty = Number(qtyByKey[k] || 0);
                        if (qty <= 0) return;
                        const cost = Number(i.costoEstimado ?? 0);
                        const cur = acc.get(i.productoId) ?? { qty: 0, sumCost: 0, sumQtyForAvg: 0 };
                        cur.qty += qty;
                        cur.sumCost += cost * qty;       // para promedio ponderado
                        cur.sumQtyForAvg += qty;
                        acc.set(i.productoId, cur);
                      });

                      const lines = Array.from(acc.entries()).map(([productoId, v]) => ({
                        productoId,
                        cantidad: Number(v.qty),
                        costoUnitario: Number(unitCostBySku[productoId] ?? (v.sumQtyForAvg > 0 ? Number((v.sumCost / v.sumQtyForAvg).toFixed(2)) : 0)),
                      }));

                      if (lines.length === 0) {
                        // Si no se ingresó nada, no creamos OC
                        return;
                      }

                      // valida que no haya costo negativo
                      if (lines.some(l => l.costoUnitario < 0)) return;

                      onCreateOC({ proveedorId, codigo, items: lines, currency });
                      setOpen(false);
                    }}
                    disabled={!proveedorId || invalidExceeds || !anyQty}
                    title={!proveedorId ? "Selecciona un proveedor" : ""}
                  >
                    Confirmar OC
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
