"use client";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OCBadge } from "./badges";
import { fmtCurrency } from "./types";
import type { Actions, OCRow } from "./types";
import { OCReceive } from "./oc-receive";
import { Pagination } from "./pagination";
import { Drawer } from "./drawer";
import { toast } from "sonner";

export function OCList({ rows, canWrite, actions }: { rows: OCRow[]; canWrite: boolean; actions: Actions }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selected, setSelected] = useState<OCRow | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.codigo.toLowerCase().includes(s) ||
      r.proveedor.nombre.toLowerCase().includes(s) ||
      r.proveedor.ruc.toLowerCase().includes(s)
    );
  }, [q, rows]);

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
                <TableCell className="text-right font-medium">{fmtCurrency(o.total)}</TableCell>
                <TableCell className="text-center">
                  <OCBadge estado={o.estado} />
                </TableCell>
                <TableCell className="text-center">
                  {canWrite && o.estado === "OPEN" && (
                    <OCReceive
                      order={o}
                      onReceive={async ({ facturaUrl, items }) => {
                        const fd = new FormData();
                        fd.set("ocId", o.id);
                        if (facturaUrl) fd.set("facturaUrl", facturaUrl);
                        if (items && items.length > 0) fd.set("items", JSON.stringify(items));
                        const r = await actions.receiveOC(fd);
                        if (r.ok) {
                          toast.success(r.message || "Recepción registrada");
                          location.reload();
                        } else toast.error(r.message);
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

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={selected ? `OC ${selected.codigo}` : undefined} width={640}>
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
                        <TableCell className="text-right">{fmtCurrency(i.costoUnitario)}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(i.importe)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="font-semibold">{fmtCurrency(selected.total)}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
