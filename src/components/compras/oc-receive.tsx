"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { OCRow } from "./types";

export function OCReceive({ order, onReceive }: { order: OCRow; onReceive: (payload: { facturaUrl?: string; items?: Array<{ productoId: string; cantidad: number }> }) => Promise<{ ok: boolean; message?: string; newEstado?: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refDoc, setRefDoc] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const hasAnyQty = useMemo(() => Object.values(qtys).some((v) => Number(v) > 0), [qtys]);

  // Solo mostrar pendientes (usa it.pendiente si viene del backend; fallback a it.cantidad)
  const pendingItems = useMemo(() => order.items.filter(it => (typeof it.pendiente === 'number' ? it.pendiente : it.cantidad) > 0), [order.items]);

  // Validaciones locales: no permitir valores negativos ni mayores que lo pendiente real
  const invalidExceeds = useMemo(() => {
    for (const it of pendingItems) {
      const pendiente = Number(it.pendiente ?? it.cantidad);
      const v = Number(qtys[it.productoId] ?? 0);
      if (v < 0) return true;
      if (v > pendiente) return true;
    }
    return false;
  }, [qtys, pendingItems]);

  const totalPending = useMemo(() => pendingItems.reduce((s, it) => s + Number(it.pendiente ?? it.cantidad), 0), [pendingItems]);
  const totalToReceive = useMemo(() => Object.entries(qtys).reduce((s, [, v]) => s + Number(v || 0), 0), [qtys]);

  function fillAllPending() {
    const next: Record<string, number> = {};
    for (const it of pendingItems) {
      const pending = Number(it.pendiente ?? it.cantidad) || 0;
      if (pending > 0) next[it.productoId] = pending;
    }
    setQtys(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Recepcionar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <span>Recepcionar OC</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">{order.codigo}</span>
              </DialogTitle>
              <div className="text-xs text-muted-foreground mt-1">Pendiente total: <span className="font-semibold text-slate-900 dark:text-slate-100">{totalPending}</span> unidades</div>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-950/20 dark:to-amber-950/10 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Referencia (Guía / Factura / Nota)</label>
            <Input placeholder="Ej: F001-12345" value={refDoc} onChange={(e) => setRefDoc(e.target.value)} className="bg-white dark:bg-slate-800" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Recepción (parcial u total)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rellenar:</span>
                <Button size="sm" variant="ghost" onClick={fillAllPending} className="text-green-600 hover:text-green-700">Recibir todo pendiente</Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2">Renglones: {pendingItems.length} • Pendiente: {totalPending} unidades</div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-slate-100 dark:bg-slate-800 p-3 sticky top-0 font-semibold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <div className="col-span-6">Producto</div>
                <div className="col-span-3 text-right">Pendiente</div>
                <div className="col-span-3 text-right">Recibir</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[40vh] overflow-auto">
                {pendingItems.map((it, idx) => {
                  const pendiente = Number(it.pendiente ?? it.cantidad);
                  const recibiendo = Number(qtys[it.productoId] ?? 0);
                  const isValid = recibiendo >= 0 && recibiendo <= pendiente;
                  return (
                    <div key={it.id} className={`grid grid-cols-12 gap-2 items-center p-3 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900/20' : 'bg-slate-50 dark:bg-slate-900/40'} ${!isValid ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <div className="col-span-6">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={`${it.nombre} — ${it.productoId}`}>
                          {it.nombre}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{it.productoId}</div>
                      </div>
                      <div className="col-span-3 text-right">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{pendiente}</div>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={pendiente}
                          step="0.01"
                          placeholder="0"
                          value={qtys[it.productoId] ?? ""}
                          onChange={(e) => setQtys((m) => ({ ...m, [it.productoId]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                          className={`text-right h-8 ${!isValid ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30' : ''}`}
                        />
                      </div>
                    </div>
                  );
                })}
                {pendingItems.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-6">No hay cantidades pendientes.</div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 p-3 border border-green-200 dark:border-green-800">
              <div className="text-sm">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Total a recibir ahora: <span className="text-lg text-green-600 dark:text-green-400">{totalToReceive}</span></div>
                {invalidExceeds && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Hay cantidades inválidas (negativas o mayores a lo pendiente).
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex w-full justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white" disabled={invalidExceeds} onClick={async () => {
              try {
                if (!hasAnyQty) {
                  toast.message("Recepción total (pendiente) enviada", { description: `OC ${order.codigo}` });

                  const r = await onReceive({});
                  if (r.ok) {
                    toast.success(r.message || "Recepción registrada");
                    router.refresh();
                    setOpen(false);
                  } else toast.error(r.message || "Error");
                } else {
                  const items = Object.entries(qtys)
                    .filter(([, v]) => Number(v) > 0)
                    .map(([productoId, cantidad]) => ({ productoId, cantidad: Number(cantidad) }));
                  toast.message("Recepción parcial enviada", { description: `${items.length} items` });

                  const r = await onReceive({ items });
                  if (r.ok) {
                    toast.success(r.message || "Recepción registrada");
                    router.refresh();
                    setOpen(false);
                  } else toast.error(r.message || "Error");
                }
              } catch (e: unknown) {
                toast.error((e as Error).message || "Error inesperado");
              }
            }}><CheckCircle2 className="h-4 w-4" />Confirmar recepción</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
