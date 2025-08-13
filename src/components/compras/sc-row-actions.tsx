"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Factory, X } from "lucide-react";
import type { Provider, SCRow } from "./types";

export function SCRowActions({ row, canWrite, providers, onApprove, onCreateOC }: {
  row: SCRow;
  canWrite: boolean;
  providers: Provider[];
  onApprove: (next: SCRow["estado"]) => void;
  onCreateOC: (payload: { proveedorId: string; codigo: string; items: Array<{ productoId: string; cantidad: number; costoUnitario: number }> }) => void;
}) {
  const [makeOC, setMakeOC] = useState(false);
  const [proveedorId, setProveedorId] = useState(providers[0]?.id ?? "");
  const [codigo, setCodigo] = useState(`OC-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6)}`);

  const itemsForOC = (row.items || []).map((i) => ({
    productoId: i.productoId,
    cantidad: i.cantidad,
    costoUnitario: Number(i.costoEstimado ?? 0), // MVP: por defecto estimado
  }));

  if (!canWrite) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {row.estado === "PENDING_ADMIN" && (
        <>
          <Button size="sm" variant="outline" onClick={() => onApprove("PENDING_GERENCIA")} className="gap-1">
            <Factory className="h-3 w-3" /> Enviar a Gerencia
          </Button>
          <Button size="sm" variant="outline" onClick={() => onApprove("REJECTED")} className="gap-1">
            <X className="h-3 w-3" /> Rechazar
          </Button>
        </>
      )}
      {row.estado === "PENDING_GERENCIA" && (
        <>
          <Button size="sm" onClick={() => onApprove("APPROVED")} className="gap-1">
            <Check className="h-3 w-3" /> Aprobar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onApprove("REJECTED")} className="gap-1">
            <X className="h-3 w-3" /> Rechazar
          </Button>
        </>
      )}
      {row.estado === "APPROVED" && !row.oc && (
        <>
          {!makeOC ? (
            <Button size="sm" onClick={() => setMakeOC(true)}>
              Crear OC
            </Button>
          ) : (
            <Card className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select className="border rounded-md h-9 px-2 col-span-2" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {p.ruc}
                    </option>
                  ))}
                </select>
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => onCreateOC({ proveedorId, codigo, items: itemsForOC })}>
                  Confirmar OC
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
