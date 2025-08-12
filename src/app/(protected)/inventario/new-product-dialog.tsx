"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const categories = [
  "MATERIA_PRIMA","HERRAMIENTA_CORTE","CONSUMIBLE","REPUESTO"
] as const;

export function NewProductDialog({
  open, onOpenChange, onSuccess, actions,
}:{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  actions: { createProduct: (fd: FormData) => Promise<{ok:boolean; message?:string}> };
}) {
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<(typeof categories)[number]>("MATERIA_PRIMA");
  const [uom, setUom] = useState("pz");
  const [costo, setCosto] = useState(0);
  const [stockMinimo, setStockMinimo] = useState<number | "">("");
  const [pending, start] = useTransition();

  const reset = () => {
    setSku(""); setNombre(""); setCategoria("MATERIA_PRIMA"); setUom("pz"); setCosto(0); setStockMinimo("");
  };

  const submit = () => {
    if (!sku || !nombre) return toast.error("Completa SKU y nombre");
    const fd = new FormData();
    fd.set("sku", sku.trim());
    fd.set("nombre", nombre.trim());
    fd.set("categoria", categoria);
    fd.set("uom", uom.trim());
    fd.set("costo", String(costo));
    if (stockMinimo !== "") fd.set("stockMinimo", String(stockMinimo));

    start(async () => {
      const r = await actions.createProduct(fd);
      if (r.ok) {
        onSuccess(r.message ?? "Producto creado");
        onOpenChange(false);
        reset();
        location.reload();
      } else toast.error(r.message);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o)=>{ if(!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>Registra un nuevo SKU en inventario</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>SKU</Label>
            <Input value={sku} onChange={e=>setSku(e.target.value)} />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input value={nombre} onChange={e=>setNombre(e.target.value)} />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={categoria} onValueChange={v=>setCategoria(v as typeof categories[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>UOM</Label>
            <Input value={uom} onChange={e=>setUom(e.target.value)} placeholder="pz, kg, m..." />
          </div>
          <div>
            <Label>Costo de referencia</Label>
            <Input type="number" step="0.01" value={costo} onChange={e=>setCosto(Number(e.target.value))} />
          </div>
          <div>
            <Label>Stock mínimo (opcional)</Label>
            <Input type="number" step="0.001" value={stockMinimo} onChange={e=>setStockMinimo(e.target.value===""?"":Number(e.target.value))} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={()=>onOpenChange(false)}>Cancelar</Button>
          <Button disabled={pending} onClick={submit}>{pending?"Guardando...":"Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
