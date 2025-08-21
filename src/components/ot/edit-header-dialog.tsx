"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Prioridad } from "./priority-badge";

type OT = NonNullable<Awaited<ReturnType<typeof import("@/app/server/queries/ot").getOTDetail>>>["ot"];
type ProductsMini = Awaited<ReturnType<typeof import("@/app/server/queries/ot").getProductsMini>> & { categoria?: string }[];
type ClientsMini = Awaited<ReturnType<typeof import("@/app/server/queries/ot").getClientsMini>>;

const NONE = "__none__"; // centinela para "Sin cliente"

export default function EditHeaderDialog({
  open, onOpenChange, ot, products, clients,
  onSave,
}:{
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  ot: OT;
  products: ProductsMini;
  clients: ClientsMini;
  onSave: (payload: {
    id: string;
    clienteId?: string | null;
    prioridad?: Prioridad;
    notas?: string;
    acabado?: string;
    materialesPlan?: { sku: string; qtyPlan: number }[];
  })=>Promise<void>;
}) {
  const [clienteId, setClienteId] = useState<string|undefined>(ot.clienteId ?? undefined);
  const [prioridad, setPrioridad] = useState<Prioridad>(ot.prioridad as Prioridad);
  const [notas, setNotas] = useState(ot.notas ?? "");
  const [acabado, setAcabado] = useState(ot.acabado ?? "");
  const [matPlan, setMatPlan] = useState<{ sku: string; qtyPlan: number }[]>(
    ot.materiales.map(m => ({ sku: m.productoId, qtyPlan: Number(m.qtyPlan || 0) }))
  );

  useEffect(()=> {
    if (!open) return;
    setClienteId(ot.clienteId ?? undefined);
    setPrioridad(ot.prioridad as Prioridad);
    setNotas(ot.notas ?? "");
    setAcabado(ot.acabado ?? "");
    setMatPlan(ot.materiales.map(m => ({ sku: m.productoId, qtyPlan: Number(m.qtyPlan || 0) })));
  }, [open, ot]);

  const addRow = () => setMatPlan(rows => [...rows, { sku: products[0]?.sku ?? "", qtyPlan: 0 }]);
  const delRow = (i:number) => setMatPlan(rows => rows.filter((_,idx)=> idx!==i));
  const setRow = (i:number, patch: Partial<{ sku: string; qtyPlan: number }>) =>
    setMatPlan(rows => rows.map((r,idx)=> idx===i ? { ...r, ...patch } : r));

  const validRows = useMemo(()=> matPlan
    .filter(r => r.sku && Number.isFinite(r.qtyPlan) && r.qtyPlan >= 0)
    .map(r => ({ sku: r.sku, qtyPlan: Number(r.qtyPlan) })), [matPlan]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar cabecera / plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={clienteId ?? NONE}
                onValueChange={(v)=> setClienteId(v === NONE ? undefined : v)}
              >
                <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin cliente</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={(v)=> setPrioridad(v as Prioridad)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baja</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Acabado</Label>
            <Select value={acabado || "NONE"} onValueChange={(v)=> setAcabado(v === "NONE" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Ninguno</SelectItem>
                <SelectItem value="TROPICALIZADO">Tropicalizado</SelectItem>
                <SelectItem value="PINTADO">Pintado</SelectItem>
                <SelectItem value="ZINCADO">Zincado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={notas} onChange={e=>setNotas(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Plan de materiales</Label>
              <Button variant="outline" size="sm" onClick={addRow}>Agregar</Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {matPlan.map((r,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <Select value={r.sku} onValueChange={(v)=> setRow(i, { sku: v })}>
                      <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                      <SelectContent>
                        {products.filter(p=> (p.categoria ? String(p.categoria).toUpperCase() !== 'FABRICACION' : true)).map(p=> (
                          <SelectItem key={p.sku} value={p.sku}>{p.nombre} ({p.sku})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min={0} value={r.qtyPlan} onChange={e=> setRow(i, { qtyPlan: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={()=>delRow(i)}>Eliminar</Button>
                  </div>
                </div>
              ))}
              {matPlan.length===0 && <div className="text-xs text-muted-foreground">Sin materiales planificados.</div>}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async ()=>{
            await onSave({
              id: ot.id,
              // si no hay cliente seleccionado -> null
              clienteId: clienteId ?? null,
              prioridad,
              notas,
              acabado,
              materialesPlan: validRows,
            });
            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
