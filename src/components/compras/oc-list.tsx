"use client";
import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OCBadge } from "./badges";
import { fmtCurrency } from "./types";
import type { Actions, OCRow } from "./types";
import { OCReceive } from "./oc-receive";
import { Pagination } from "./pagination";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";

export function OCList({ rows, canWrite, actions, currency = "USD", estadoOptions }: { rows: OCRow[]; canWrite: boolean; actions: Actions; currency?: string; estadoOptions?: { value: string; label: string; color?: string | null }[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selected, setSelected] = useState<OCRow | null>(null);
  // Mantener copia local de rows para actualizar en memoria sin recargar
  const [localRows, setLocalRows] = useState<OCRow[]>(rows);

  // sincronizar cuando cambian las rows del padre
  React.useEffect(() => setLocalRows(rows), [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return localRows;
    return localRows.filter((r) =>
      r.codigo.toLowerCase().includes(s) ||
      r.proveedor.nombre.toLowerCase().includes(s) ||
      r.proveedor.ruc.toLowerCase().includes(s)
    );
  }, [q, localRows]);

  const total = filtered.length;
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center gap-3 max-w-lg">
        <Input placeholder="Buscar por código o proveedor..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Código</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono cursor-pointer hover:underline" onClick={() => setSelected(o)}>{o.codigo}</TableCell>
                <TableCell>
                  <div className="font-medium">{o.proveedor.nombre}</div>
                  <div className="text-xs text-muted-foreground">{o.proveedor.ruc}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(o.fecha).toLocaleDateString()}</TableCell>
                <TableCell className="text-right font-medium">{fmtCurrency(o.total, o.currency || currency)}</TableCell>
                <TableCell className="text-center">
                  <OCBadge estado={o.estado} options={estadoOptions} />
                </TableCell>
                <TableCell className="text-center">
                  {canWrite && (o.estado === "OPEN" || o.estado === "PARTIAL") && (
                    <OCReceive
                      order={o}
                      onReceive={async ({ facturaUrl, items }) => {
                        const fd = new FormData();
                        fd.set("ocId", o.id);
                        if (facturaUrl) fd.set("facturaUrl", facturaUrl);
                        if (items && items.length > 0) fd.set("items", JSON.stringify(items));
                        const r = await actions.receiveOC(fd) as { ok: boolean; message?: string; newEstado?: string };
                        if (r.ok) {
                          setLocalRows((prev) => prev.map((row) => {
                            if (row.id !== o.id) return row;
                            // Actualizar pendientes locales si tenemos items enviados
                            let updatedItems = row.items;
                            if (items && items.length > 0) {
                              const qtyMap = Object.fromEntries(items.map(it => [it.productoId, it.cantidad]));
                              updatedItems = row.items.map(it => {
                                const recibidoAhora = qtyMap[it.productoId] ?? 0;
                                const basePend = typeof it.pendiente === 'number' ? it.pendiente : it.cantidad;
                                const nuevoPend = Math.max(0, Number((basePend - recibidoAhora).toFixed(3)));
                                return { ...it, pendiente: r.newEstado === 'RECEIVED' ? 0 : nuevoPend };
                              });
                            } else if (r.newEstado === 'RECEIVED') {
                              // recepción total sin items => todo a 0
                              updatedItems = row.items.map(it => ({ ...it, pendiente: 0 }));
                            }
                            return {
                              ...row,
                              estado: (r.newEstado as OCRow["estado"]) || row.estado,
                              items: updatedItems,
                              pendienteTotal: updatedItems.reduce((s, it) => s + (it.pendiente ?? 0), 0)
                            };
                          }));
                          toast.success(r.message || "Recepción registrada");
                        } else {
                          toast.error(r.message);
                        }
                        return r;
                      }}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin órdenes</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="!max-w-[640px]" style={{ width: Math.min(640, typeof window !== 'undefined' ? window.innerWidth - 40 : 640) }}>
          <div className="flex items-center justify-between mb-2">
            <DialogTitle>{selected ? `OC ${selected.codigo}` : ""}</DialogTitle>
            <DialogClose className="text-sm text-muted-foreground hover:underline">Cerrar</DialogClose>
          </div>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Proveedor</div>
                  <div className="font-medium">{selected.proveedor.nombre}</div>
                  <div className="text-xs text-muted-foreground">{selected.proveedor.ruc}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Fecha</div>
                  <div className="text-sm">{new Date(selected.fecha).toLocaleDateString()}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Items</div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead className="text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.items.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>{i.nombre}</TableCell>
                          <TableCell>{i.cantidad} {i.uom}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(i.costoUnitario, selected.currency || currency)}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(i.importe, selected.currency || currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="font-semibold">{fmtCurrency(selected.total, selected.currency || currency)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
