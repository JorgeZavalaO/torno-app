"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, User, AlertTriangle, Package } from "lucide-react";
import { ACABADO_OPTIONS } from "./acabado-constants";
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
  const router = useRouter();
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5" />
            Editar cabecera / plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-4 w-4" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cliente</Label>
                  <Select
                    value={clienteId ?? NONE}
                    onValueChange={(v)=> setClienteId(v === NONE ? undefined : v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sin cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin cliente</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prioridad</Label>
                  <Select value={prioridad} onValueChange={(v)=> setPrioridad(v as Prioridad)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">🔵 Baja</SelectItem>
                      <SelectItem value="MEDIUM">🟡 Media</SelectItem>
                      <SelectItem value="HIGH">🟠 Alta</SelectItem>
                      <SelectItem value="URGENT">🔴 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Acabado</Label>
                  <Select value={acabado || "NONE"} onValueChange={(v)=> setAcabado(v === "NONE" ? "" : v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleccionar acabado" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACABADO_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notas</Label>
                  <Input 
                    value={notas} 
                    onChange={e=>setNotas(e.target.value)} 
                    placeholder="Observaciones adicionales..."
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan de Materiales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg">
                  <Package className="h-4 w-4" />
                  Plan de materiales
                  <Badge variant="secondary" className="ml-2">
                    {validRows.length} material{validRows.length !== 1 ? 'es' : ''}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matPlan.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {matPlan.map((r,i)=>(
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground">Producto</Label>
                        <Select value={r.sku} onValueChange={(v)=> setRow(i, { sku: v })}>
                          <SelectTrigger className="h-9 mt-1">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.filter(p=> (p.categoria ? String(p.categoria).toUpperCase() !== 'FABRICACION' : true)).map(p=> (
                              <SelectItem key={p.sku} value={p.sku}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{p.nombre}</span>
                                  <span className="text-xs text-muted-foreground">SKU: {p.sku}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs text-muted-foreground">Cantidad</Label>
                        <Input 
                          type="number" 
                          min={0} 
                          value={r.qtyPlan} 
                          onChange={e=> setRow(i, { qtyPlan: Number(e.target.value) })}
                          className="h-9 mt-1 text-center"
                          placeholder="0"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={()=>delRow(i)}
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Sin materiales planificados</p>
                  <p className="text-xs">Haz clic en &ldquo;Agregar&rdquo; para añadir materiales</p>
                </div>
              )}
              
              {validRows.length !== matPlan.length && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    {matPlan.length - validRows.length} material(es) no válido(s) serán omitidos
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={()=> onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={async ()=>{
            await onSave({
              id: ot.id,
              clienteId: clienteId ?? null,
              prioridad,
              notas,
              acabado,
              materialesPlan: validRows,
            });
            onOpenChange(false);
            // Forzar refresh para reflejar los cambios en el detalle y listas
            startTransition(() => router.refresh());
            await new Promise((res)=> setTimeout(res, 350));
            startTransition(() => router.refresh());
          }}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
