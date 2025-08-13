"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "./types";

export function NewSCDialog({ products, onCreate }: { products: Product[]; onCreate: (payload: { otId?: string; notas?: string; items: Array<{ productoId: string; cantidad: number; costoEstimado?: number | null }> }) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Array<{ productoId: string; cantidad: number; costoEstimado?: number | null }>>([]);
  const [otId, setOtId] = useState("");
  const [notas, setNotas] = useState("");

  const addRow = () => setRows((r) => [...r, { productoId: products[0]?.sku ?? "", cantidad: 1 }]);
  const setRow = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const totalEst = useMemo(() => rows.reduce((acc, r) => acc + Number(r.costoEstimado ?? 0) * Number(r.cantidad || 0), 0), [rows]);
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "PEN" }).format(n);

  // Atajo: Enter crea si hay filas; Esc cierra
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Enter" && rows.length > 0) handleCreate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rows]);

  async function handleCreate() {
    if (rows.length === 0) return toast.error("Agrega al menos un ítem");
    await onCreate({ otId: otId || undefined, notas: notas || undefined, items: rows });
    setOpen(false);
    setRows([]);
    setOtId("");
    setNotas("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nueva solicitud
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de compra</DialogTitle>
          <DialogDescription>Agrega productos, cantidades y costos estimados. Presiona Enter para crear.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
          <div>
            <div className="text-sm text-muted-foreground">OT (opcional)</div>
            <Input value={otId} onChange={(e) => setOtId(e.target.value)} placeholder="Código OT" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Notas</div>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Motivo / observación" />
          </div>
        </div>

        <div className="mt-4 space-y-2 max-h-[45vh] overflow-auto pr-1">
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
            <div className="col-span-6">Producto</div>
            <div className="col-span-2">Cantidad</div>
            <div className="col-span-3">Costo estimado</div>
            <div className="col-span-1" />
          </div>
          {rows.map((r, idx) => {
            const uom = products.find((p) => p.sku === r.productoId)?.uom;
            return (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <select className="w-full border rounded-md h-9 px-2" value={r.productoId} onChange={(e) => setRow(idx, { productoId: e.target.value })}>
                    {products.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.nombre} — {p.sku}
                      </option>
                    ))}
                  </select>
                  {uom && <div className="text-[10px] text-muted-foreground mt-0.5">Unidad: {uom}</div>}
                </div>
                <div className="col-span-2">
                  <Input type="number" inputMode="decimal" min={0.001} step="0.001" placeholder="0" value={r.cantidad} onChange={(e) => setRow(idx, { cantidad: Number(e.target.value) })} />
                </div>
                <div className="col-span-3">
                  <Input type="number" inputMode="decimal" min={0} step="0.01" placeholder="0.00" value={r.costoEstimado ?? ""} onChange={(e) => setRow(idx, { costoEstimado: e.target.value === "" ? undefined : Number(e.target.value) })} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button aria-label="Eliminar fila" title="Eliminar fila" variant="outline" onClick={() => removeRow(idx)}>
                    —
                  </Button>
                </div>
              </div>
            );
          })}
          <Button variant="outline" onClick={addRow} className="gap-2">
            <Plus className="h-4 w-4" /> Agregar item
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-muted-foreground">Total estimado</div>
          <div className="text-lg font-semibold">{fmt(totalEst)}</div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate}>Crear</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
