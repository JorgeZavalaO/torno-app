"use client";
import { useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";
import { toast } from "sonner";
import type { Actions, Provider, SCRow } from "./types";
import { fmtCurrency } from "./types";
import { SCBadge } from "./badges";
import { SCRowActions } from "./sc-row-actions";
import { Pagination } from "./pagination";

// 👇 nuevo: import Dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function SCList({
  rows,
  providers,
  canWrite,
  actions,
}: {
  rows: SCRow[];
  providers: Provider[];
  canWrite: boolean;
  actions: Actions;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selected, setSelected] = useState<SCRow | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.items.some((i) => i.nombre?.toLowerCase().includes(s) || i.productoId.toLowerCase().includes(s)) ||
      r.solicitante.email.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s)
    );
  }, [q, rows]);

  const total = filtered.length;
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center gap-3 max-w-lg">
        <Package className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por producto, SKU, solicitante o ID..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>ID</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total Est.</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((r) => (
              <TableRow key={r.id}>
                <TableCell
                  className="font-mono cursor-pointer hover:underline"
                  onClick={() => setSelected(r)}
                >
                  #{r.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {r.solicitante.displayName ?? r.solicitante.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>
                  {r.ot ? (
                    <a
                      href={`/ot/${r.ot.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {r.ot.codigo}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {r.items.map((i, idx) => (
                      <div key={i.id ?? `${i.productoId}-${idx}`}>
                        {i.nombre ?? i.productoId} · {i.cantidad} {i.uom}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">{fmtCurrency(r.totalEstimado)}</TableCell>
                <TableCell className="text-center">
                  <SCBadge estado={r.estado} />
                </TableCell>
                <TableCell className="text-center">
                  <SCRowActions
                    row={r}
                    canWrite={canWrite}
                    providers={providers}
                    onApprove={async (next) => {
                      const rr = await actions.setSCState(r.id, next);
                      if (rr.ok) {
                          toast.success(rr.message || "Estado actualizado");
                          startTransition(() => router.refresh());
                        } else toast.error(rr.message);
                    }}
                    onCreateOC={async (payload) => {
                      const fd = new FormData();
                      fd.set("scId", r.id);
                      fd.set("proveedorId", payload.proveedorId);
                      fd.set("codigo", payload.codigo);
                      fd.set("items", JSON.stringify(payload.items));
                      const rr = await actions.createOC(fd);
                      if (rr.ok) {
                        toast.success(rr.message || "OC creada");
                        startTransition(() => router.refresh());
                      } else toast.error(rr.message);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Sin solicitudes
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />

      {/* 👇 Dialog de detalle de SC */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[720px]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>SC #{selected.id.slice(0, 8)}</DialogTitle>
                <DialogDescription>
                  Detalle de la solicitud de compra.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Solicitante</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {selected.solicitante.displayName ?? selected.solicitante.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(selected.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <SCBadge estado={selected.estado} />
                </div>

                {selected.ot && (
                  <div>
                    <div className="text-sm text-muted-foreground mt-2">Orden de Trabajo (OT)</div>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        <a href={`/ot/${selected.ot.id}`} className="hover:underline">
                          {selected.ot.codigo}
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground">Ir a OT</div>
                    </div>
                  </div>
                )}

                {selected.notas && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Notas</div>
                    <div className="text-sm whitespace-pre-wrap">{selected.notas}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Items</div>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead className="text-right">Costo Est.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((i, idx) => (
                          <TableRow key={i.id ?? `${i.productoId}-${idx}`}>
                            <TableCell>{i.nombre ?? i.productoId}</TableCell>
                            <TableCell>
                              {i.cantidad} {i.uom}
                            </TableCell>
                            <TableCell className="text-right">
                              {i.costoEstimado != null ? fmtCurrency(i.costoEstimado) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">Total estimado</div>
                  <div className="font-semibold">{fmtCurrency(selected.totalEstimado)}</div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
