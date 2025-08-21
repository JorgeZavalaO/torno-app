"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { unidadesMedida } from "../../app/(protected)/inventario/uoms";
import { CATEGORIES } from "@/lib/product-categories";

export function NewProductDialog({
  open, onOpenChange, onSuccess, actions,
}:{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  actions: { createProduct: (fd: FormData) => Promise<{ok:boolean; message?:string; sku?: string}> };
}) {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [uom, setUom] = useState("pz");
  const [costo, setCosto] = useState(0);
  const [stockMinimo, setStockMinimo] = useState<number | "">("");
  const [pending, start] = useTransition();

  const reset = () => {
    setSku("");
    setNombre("");
    setCategoria(CATEGORIES[0]);
    setUom("pz");
    setCosto(0);
    setStockMinimo("");
  };

  const submit = () => {
    if (!nombre) return toast.error("Completa el nombre del producto");
    const fd = new FormData();
    const skuClean = sku.trim().toUpperCase();
    if (skuClean) fd.set("sku", skuClean);

    fd.set("nombre", nombre.trim());
    fd.set("categoria", categoria);
    fd.set("uom", uom);
    fd.set("costo", String(costo));
    if (stockMinimo !== "") fd.set("stockMinimo", String(stockMinimo));

    start(async () => {
      const r = await actions.createProduct(fd);
      if (r.ok) {
        onSuccess(`${r.message ?? "Producto creado"} (${r.sku})`);
        onOpenChange(false);
        reset();
        router.refresh();
      } else toast.error(r.message);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o)=>{ if(!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>Registra un nuevo SKU en inventario (se generará automáticamente)</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={e=>setNombre(e.target.value)} />
          </div>
          <div>
            <Label>Categoría</Label>
      <Select value={categoria} onValueChange={v=>setCategoria(v as (typeof CATEGORIES)[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidad de medida</Label>
            <Select value={uom} onValueChange={setUom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {unidadesMedida.map(um => (
                  <SelectItem key={um.value} value={um.value}>{um.label} ({um.value})</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
