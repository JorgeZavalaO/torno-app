"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
// ...existing code...
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { OCRow } from "./types";

export function OCReceive({ order, onReceive }: { order: OCRow; onReceive: (payload: { facturaUrl?: string; items?: Array<{ productoId: string; cantidad: number }> }) => Promise<{ ok: boolean; message?: string; newEstado?: string }> }) {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span className="text-base font-semibold">Recepcionar OC <span className="font-mono">{order.codigo}</span></span>
            <span className="text-xs font-normal text-muted-foreground">Pendiente total: {totalPending}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Referencia (Guía / Factura / Nota)</div>
          <Input placeholder="Ej: F001-12345" value={refDoc} onChange={(e) => setRefDoc(e.target.value)} />

          <div className="text-sm text-muted-foreground mt-2">Recepción parcial (opcional)</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>Renglones pendientes: {pendingItems.length} • Pendiente total: {totalPending}</div>
            <div className="flex items-center gap-2">
              <div className="text-xxs text-muted-foreground">Rellenar rápidos:</div>
              <Button size="sm" variant="ghost" onClick={fillAllPending}>Recibir todo</Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground border-b pb-1">
            <div className="col-span-6">Producto</div>
            <div className="col-span-3 text-right">Pendiente</div>
            <div className="col-span-3 text-right">Recibir</div>
          </div>
          <div className="space-y-2 max-h-[45vh] overflow-auto pr-1">
            {pendingItems.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6 truncate" title={`${it.nombre} — ${it.productoId}`}>
                  {it.nombre}
                </div>
                <div className="col-span-3 text-right">
                  {it.pendiente ?? it.cantidad}
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={it.pendiente ?? it.cantidad}
                    step="0.001"
                    placeholder="0"
                    value={qtys[it.productoId] ?? ""}
                    onChange={(e) => setQtys((m) => ({ ...m, [it.productoId]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                  />
                  <div className="flex justify-end mt-1 gap-1">
                    <Button size="sm" variant="link" onClick={() => setQtys((m) => ({ ...m, [it.productoId]: Number(it.pendiente ?? it.cantidad) }))}>
                      todo
                    </Button>
                    <Button size="sm" variant="link" onClick={() => setQtys((m) => ({ ...m, [it.productoId]: 0 }))}>
                      limpiar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {pendingItems.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6">No hay cantidades pendientes.</div>
            )}
          </div>

          <div className="pt-2 text-sm">
            <div className="text-muted-foreground">Total a recibir ahora: {totalToReceive}</div>
            {invalidExceeds && <div className="text-xs text-red-600">Hay cantidades inválidas (negativas o mayores a lo pendiente).</div>}
          </div>
        </div>
        <DialogFooter>
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" disabled={invalidExceeds} onClick={async () => {
              try {
                if (!hasAnyQty) {
                  toast.message("Recepción total (pendiente) enviada", { description: `OC ${order.codigo}` });
                  console.log('[OCReceive] submit total', { ocId: order.id, codigo: order.codigo });
                  const r = await onReceive({});
                  if (r.ok) {
                    toast.success(r.message || "Recepción registrada");
                    setOpen(false);
                  } else toast.error(r.message || "Error");
                } else {
                  const items = Object.entries(qtys)
                    .filter(([, v]) => Number(v) > 0)
                    .map(([productoId, cantidad]) => ({ productoId, cantidad: Number(cantidad) }));
                  toast.message("Recepción parcial enviada", { description: `${items.length} items` });
                  console.log('[OCReceive] submit parcial', { ocId: order.id, codigo: order.codigo, items });
                  const r = await onReceive({ items });
                  if (r.ok) {
                    toast.success(r.message || "Recepción registrada");
                    setOpen(false);
                  } else toast.error(r.message || "Error");
                }
              } catch (e: unknown) {
                toast.error((e as Error).message || "Error inesperado");
              }
            }}>Confirmar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
