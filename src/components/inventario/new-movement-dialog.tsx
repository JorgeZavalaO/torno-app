"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const types = [
  { v:"INGRESO_COMPRA", label:"Ingreso por compra" },
  { v:"INGRESO_AJUSTE", label:"Ingreso por ajuste" },
  { v:"SALIDA_AJUSTE", label:"Salida por ajuste" },
  { v:"SALIDA_OT", label:"Salida a OT" },
] as const;

export function NewMovementDialog({
  open, onOpenChange, products, actions, onSuccess
}:{
  open: boolean; onOpenChange:(o:boolean)=>void;
  products: Array<{ sku: string; nombre: string; uom: string }>;
  actions: { createMovement: (fd: FormData) => Promise<{ok:boolean; message?:string}> };
  onSuccess: (msg: string) => void;
}) {
  const router = useRouter();
  const [productoId, setProductoId] = useState(products[0]?.sku ?? "");
  const [tipo, setTipo] = useState<typeof types[number]["v"]>("INGRESO_COMPRA");
  const [cantidad, setCantidad] = useState(1);
  const [costoUnitario, setCostoUnitario] = useState(0);
  const [refTabla, setRefTabla] = useState("");
  const [refId, setRefId] = useState("");
  const [nota, setNota] = useState("");
  const [pending, start] = useTransition();

  const reset = () => {
    setTipo("INGRESO_COMPRA"); setCantidad(1); setCostoUnitario(0); setRefTabla(""); setRefId(""); setNota("");
  };

  const submit = () => {
    if (!productoId) return toast.error("Selecciona un producto");
    if (cantidad <= 0) return toast.error("Cantidad debe ser > 0");

    const fd = new FormData();
    fd.set("productoId", productoId);
    fd.set("tipo", tipo);
    fd.set("cantidad", String(cantidad));
    fd.set("costoUnitario", String(costoUnitario));
    if (refTabla) fd.set("refTabla", refTabla);
    if (refId) fd.set("refId", refId);
    if (nota) fd.set("nota", nota);

    start(async () => {
      const r = await actions.createMovement(fd);
      if (r.ok) {
        onSuccess(r.message ?? "Movimiento registrado");
        onOpenChange(false);
        reset();
        router.refresh();
      } else {
        toast.error(r.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o)=>{ if(!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
          <DialogDescription>Registra un ingreso o salida de stock</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Producto</Label>
            <Select value={productoId} onValueChange={setProductoId}>
              <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.sku} value={p.sku}>{p.nombre} — {p.sku}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={v=>setTipo(v as typeof types[number]["v"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cantidad</Label>
            <Input type="number" step="0.001" min={0.001} value={cantidad} onChange={e=>setCantidad(Number(e.target.value))} />
          </div>

          <div>
            <Label>Costo unitario</Label>
            <Input type="number" step="0.01" min={0} value={costoUnitario} onChange={e=>setCostoUnitario(Number(e.target.value))} />
          </div>

          <div>
            <Label>Ref. tabla (opcional)</Label>
            <Input value={refTabla} onChange={e=>setRefTabla(e.target.value)} placeholder="p.ej., OT, OC" />
          </div>
          <div>
            <Label>Ref. id (opcional)</Label>
            <Input value={refId} onChange={e=>setRefId(e.target.value)} placeholder="código/ID externo" />
          </div>

          <div className="md:col-span-2">
            <Label>Nota (opcional)</Label>
            <Textarea value={nota} onChange={e=>setNota(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={()=>onOpenChange(false)}>Cancelar</Button>
          <Button disabled={pending} onClick={submit}>{pending ? "Guardando..." : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
