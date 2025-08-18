"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Factory, X } from "lucide-react";
import type { Provider, SCRow } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SCRowActions({
  row,
  canWrite,
  providers,
  onApprove,
  onCreateOC,
}: {
  row: SCRow;
  canWrite: boolean;
  providers: Provider[];
  onApprove: (next: SCRow["estado"]) => void;
  onCreateOC: (payload: {
    proveedorId: string;
    codigo: string;
    items: Array<{ productoId: string; cantidad: number; costoUnitario: number }>;
  }) => void;
}) {
  const hasProviders = providers.length > 0;
  const defaultCodigo = useMemo(
    () => `OC-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6)}`,
    []
  );
  const [proveedorId, setProveedorId] = useState(hasProviders ? providers[0].id : "");
  const [codigo, setCodigo] = useState(defaultCodigo);
  const [open, setOpen] = useState(false);

  const itemsForOC = (row.items || []).map((i) => ({
    productoId: i.productoId,
    cantidad: i.cantidad,
    // MVP: por defecto usamos costoEstimado como costoUnitario
    costoUnitario: Number(i.costoEstimado ?? 0),
  }));

  if (!canWrite) return null;

  return (
    <div className="flex items-center justify-center gap-2">
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

      {row.estado === "APPROVED" && !row.oc && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={!hasProviders}
              title={hasProviders ? "" : "Primero registra un proveedor"}
            >
              Crear OC
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Crear Orden de Compra</DialogTitle>
              <DialogDescription>
                Genera una OC a partir de la solicitud aprobada.
              </DialogDescription>
            </DialogHeader>

            {!hasProviders ? (
              <div className="text-sm text-red-600">
                No hay proveedores. Crea uno antes de generar la OC.
              </div>
            ) : (
              <>
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
                          {p.nombre} — {p.ruc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Código</div>
                    <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-muted-foreground mb-1">
                    Items a incluir
                  </div>
                  <div className="max-h-[40vh] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-2">Producto</th>
                          <th className="text-right p-2">Cantidad</th>
                          <th className="text-right p-2">Costo Unit. (est.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.items.map((i, idx) => (
                          <tr key={i.id ?? `${i.productoId}-${idx}`}>
                            <td className="p-2">{i.nombre ?? i.productoId}</td>
                            <td className="p-2 text-right">{i.cantidad} {i.uom}</td>
                            <td className="p-2 text-right">
                              {i.costoEstimado != null ? Number(i.costoEstimado).toFixed(2) : "0.00"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (!proveedorId) return;
                      onCreateOC({ proveedorId, codigo, items: itemsForOC });
                      setOpen(false);
                    }}
                    disabled={!proveedorId}
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
