"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OCRow } from "./types";

export function OCReceive({ order, onReceive }: { order: OCRow; onReceive: (payload: { facturaUrl?: string; items?: Array<{ productoId: string; cantidad: number }> }) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});

  // valores por defecto: vacío (para recepción total). Si el usuario llena, será parcial.
  const hasAnyQty = useMemo(() => Object.values(qtys).some((v) => Number(v) > 0), [qtys]);

  return (
    <>
      {!open ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          Recepcionar
        </Button>
      ) : (
        <Card className="p-3 space-y-2 w-[min(95vw,640px)]">
          <div className="text-sm text-muted-foreground">URL de factura (opcional)</div>
          <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />

          <div className="text-sm text-muted-foreground mt-2">Recepción parcial (opcional)</div>
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
            <div className="col-span-6">Producto</div>
            <div className="col-span-3 text-right">Pendiente</div>
            <div className="col-span-3 text-right">Recibir ahora</div>
          </div>
          <div className="space-y-2 max-h-[45vh] overflow-auto pr-1">
            {order.items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6 truncate" title={`${it.nombre} — ${it.productoId}`}>
                  {it.nombre}
                </div>
                <div className="col-span-3 text-right">
                  {it.cantidad}
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={it.cantidad}
                    step="0.001"
                    placeholder="0"
                    value={qtys[it.productoId] ?? ""}
                    onChange={(e) => setQtys((m) => ({ ...m, [it.productoId]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!hasAnyQty) onReceive({ facturaUrl: url || undefined });
                else {
                  const items = Object.entries(qtys)
                    .filter(([, v]) => Number(v) > 0)
                    .map(([productoId, cantidad]) => ({ productoId, cantidad: Number(cantidad) }));
                  onReceive({ facturaUrl: url || undefined, items });
                }
              }}
            >
              Confirmar
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
