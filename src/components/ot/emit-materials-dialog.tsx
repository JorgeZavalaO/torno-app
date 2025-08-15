"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// ...existing code...

type MatRow = { sku: string; nombre: string; uom?: string; plan: number; emit: number; pend: number };
type ProductsMini = Awaited<ReturnType<typeof import("@/app/server/queries/ot").getProductsMini>>;

export default function EmitMaterialsDialog({
  open, onOpenChange, materials, products, onEmit
}:{
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  materials: MatRow[];
  products: ProductsMini;
  onEmit: (items: { sku: string; qty: number }[])=>Promise<void>;
}) {
  const [rows, setRows] = useState<{ sku: string; qty: number }[]>([]);
  const addFromPlan = () => {
    const defaults = materials
      .filter(m => m.pend > 0)
      .map(m => ({ sku: m.sku, qty: m.pend }));
    setRows(defaults.length ? defaults : [{ sku: products[0]?.sku ?? "", qty: 1 }]);
  };
  const addRow = () => setRows(prev => [...prev, { sku: products[0]?.sku ?? "", qty: 1 }]);
  const delRow = (idx: number) => setRows(prev => prev.filter((_,i)=>i!==idx));
  const setRow = (idx:number, patch: Partial<{ sku: string; qty: number }>) =>
    setRows(prev => prev.map((r,i)=> i===idx ? { ...r, ...patch } : r));

  const valid = useMemo(()=> rows.filter(r => r.sku && r.qty>0), [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>Emitir materiales</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addFromPlan}>Precargar faltantes</Button>
            <Button variant="secondary" size="sm" onClick={addRow}>Agregar línea</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r,i)=>(
                <TableRow key={i}>
                  <TableCell className="w-[70%]">
                    <Select value={r.sku} onValueChange={(v)=> setRow(i, { sku: v })}>
                      <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                      <SelectContent>
                        {/* Primero materiales planificados */}
                        {materials.map(m=>(
                          <SelectItem key={`plan-${m.sku}-${i}`} value={m.sku}>
                            {m.nombre} ({m.sku})
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs text-muted-foreground">— Todos —</div>
                        {products.map(p=>(
                          <SelectItem key={`all-${p.sku}-${i}`} value={p.sku}>
                            {p.nombre} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" min={0.001} step="0.001" value={r.qty} onChange={e=> setRow(i, { qty: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant="ghost" onClick={()=>delRow(i)}>Eliminar</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length===0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Añade líneas para emitir</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <div className="text-xs text-muted-foreground">
            * Las salidas se registran con signo negativo (convención) y actualizan el emitido de la OT.
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async ()=>{
            await onEmit(valid);
            onOpenChange(false);
          }} disabled={valid.length===0}>Emitir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
