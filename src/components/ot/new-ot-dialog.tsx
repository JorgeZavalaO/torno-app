"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Hammer, Layers } from "lucide-react";
import { ClientSelect, ClientOption } from "@/components/ot/client-select";
import { PrioritySelect } from "@/components/ot/priority-select";
import { toast } from "sonner";

export type NewOTDialogPayload = {
  piezas: { sku?: string; descripcion?: string; qty: number }[];
  materiales: { sku: string; qty: number }[];
  clienteId?: string;
  cotizacionId?: string;
  notas?: string;
  prioridad?: "LOW"|"MEDIUM"|"HIGH"|"URGENT";
  acabado?: string;
  autoSC?: boolean;
};

interface Product { sku: string; nombre: string; uom: string }

export function NewOTDialog({ products, clients, onCreate, isCreating }:{
  products: Product[];
  clients: ClientOption[];
  onCreate: (payload: NewOTDialogPayload) => Promise<void>;
  isCreating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1|2|3>(1);
  const [piezas, setPiezas] = useState<{sku?: string; descripcion?: string; qty: number}[]>([{ qty: 1 }]);
  const [materiales, setMateriales] = useState<{sku: string; qty: number}[]>([]);
  const [clienteId, setClienteId] = useState<string|undefined>();
  const [prioridad, setPrioridad] = useState<"LOW"|"MEDIUM"|"HIGH"|"URGENT">("MEDIUM");
  const [acabado, setAcabado] = useState("");
  const [notas, setNotas] = useState("");
  const [autoSC, setAutoSC] = useState(true);

  const reset = () => {
    setStep(1);
    setPiezas([{ qty: 1 }]);
    setMateriales([]);
    setClienteId(undefined);
    setPrioridad("MEDIUM");
    setAcabado("");
    setNotas("");
    setAutoSC(true);
  };

  const handleCreate = async () => {
    if (piezas.filter(p => (p.sku || p.descripcion) && p.qty>0).length === 0) {
      toast.error("Agrega al menos una pieza válida");
      setStep(1); return;
    }
    if (materiales.filter(m => m.sku && m.qty>0).length === 0) {
      toast.error("Agrega materiales válidos");
      setStep(2); return;
    }
    await onCreate({
      piezas: piezas.filter(p => (p.sku || p.descripcion) && p.qty>0),
      materiales: materiales.filter(m => m.sku && m.qty>0),
      clienteId,
      prioridad,
      acabado: acabado.trim() || undefined,
      notas: notas.trim() || undefined,
      autoSC,
    });
    reset();
    setOpen(false);
  };

  // Piezas handlers - digitables (sin afectar inventario al crear)
  const addPieza = () => setPiezas(p => [...p, { qty: 1 }]);
  const updatePieza = (i:number, field:'sku'|'descripcion'|'qty', value:string|number)=>{
    setPiezas(prev => prev.map((pz,idx)=> idx===i ? { ...pz, [field]: value } : pz));
  };
  const removePieza = (i:number) => setPiezas(prev => prev.filter((_,idx)=>idx!==i));

  // Materiales handlers
  const addMaterial = () => setMateriales(m => [...m,{ sku: "", qty: 1 }]);
  const updateMaterial = (i:number, field:'sku'|'qty', value:string|number)=>{
    setMateriales(prev => prev.map((m,idx)=> idx===i ? { ...m, [field]: value } : m));
  };
  const removeMaterial = (i:number) => setMateriales(prev => prev.filter((_,idx)=>idx!==i));

  return (
    <Dialog open={open} onOpenChange={(v)=>{ if(!v) reset(); setOpen(v); }}>
      <DialogTrigger asChild>
        <Button disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" /> Nueva OT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" /> Nueva Orden de Trabajo
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-2 text-xs font-medium mb-2">
          {[1,2,3].map(s => (
            <div key={s} className={`px-3 py-1 rounded-full border ${step===s? 'bg-primary text-primary-foreground border-primary':'bg-muted'}`}>Paso {s}</div>
          ))}
        </div>
        {step===1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ClientSelect clients={clients} value={clienteId} onChange={setClienteId} />
              <PrioritySelect value={prioridad} onChange={setPrioridad} />
            </div>
            <div>
              <label className="text-sm font-semibold">Piezas a fabricar</label>
              <p className="text-xs text-muted-foreground mb-2">Ingresa manualmente piezas; no se descuenta inventario ahora, solo planifica la producción.</p>
              <div className="space-y-3">
                {piezas.map((p,i)=>(
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <Input placeholder="Código (opcional)" value={p.sku||""} onChange={e=>updatePieza(i,'sku',e.target.value)} />
                    </div>
                    <div className="col-span-7">
                      <Input placeholder="Descripción" value={p.descripcion||""} onChange={e=>updatePieza(i,'descripcion',e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min={1} value={p.qty} onChange={e=>updatePieza(i,'qty',Number(e.target.value))} />
                    </div>
                    <div className="col-span-12 flex justify-end -mt-1">
                      <Button size="sm" variant="ghost" onClick={()=>removePieza(i)}>Eliminar</Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addPieza}><Plus className="h-3 w-3 mr-1"/> Añadir pieza</Button>
              </div>
            </div>
          </div>
        )}
        {step===2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4" /> Materiales Planificados</label>
              <Button size="sm" variant="outline" onClick={addMaterial}><Plus className="h-3 w-3 mr-1"/>Agregar</Button>
            </div>
            <p className="text-xs text-muted-foreground">Estos materiales se utilizarán para calcular faltantes y generar solicitudes de compra si lo permites.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {materiales.map((m,i)=>(
                <div key={i} className="flex gap-2 items-center">
                  <select value={m.sku} onChange={e=>updateMaterial(i,'sku',e.target.value)} className="flex-1 h-9 border rounded-md px-2">
                    <option value="">Producto...</option>
                    {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre} ({p.sku})</option> )}
                  </select>
                  <Input type="number" min={1} value={m.qty} onChange={e=>updateMaterial(i,'qty',Number(e.target.value))} className="w-24" />
                  <Button size="sm" variant="ghost" onClick={()=>removeMaterial(i)}>×</Button>
                </div>
              ))}
              {materiales.length===0 && <div className="text-xs text-muted-foreground">Sin materiales aún.</div>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Checkbox checked={autoSC} onCheckedChange={v=>setAutoSC(Boolean(v))} />
              Generar solicitud de compra automática por faltantes
            </div>
          </div>
        )}
        {step===3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Tipo de acabado</label>
              <Input value={acabado} onChange={e=>setAcabado(e.target.value)} placeholder="Ej: anodizado, pintura, pulido..." />
            </div>
            <div>
              <label className="text-sm font-semibold">Notas</label>
              <Input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Observaciones de la OT" />
            </div>
            <div className="text-xs text-muted-foreground border rounded-md p-3 space-y-1">
              <div><strong>{piezas.filter(p=> (p.sku||p.descripcion)&&p.qty>0).length}</strong> pieza(s) válidas</div>
              <div><strong>{materiales.filter(m=>m.sku&&m.qty>0).length}</strong> material(es) planificados</div>
              <div>Prioridad: <strong>{prioridad}</strong>{acabado?` · Acabado: ${acabado}`:""}</div>
            </div>
          </div>
        )}
        <DialogFooter className="mt-4">
          <div className="flex-1 flex justify-start gap-2">
            {step>1 && <Button variant="outline" size="sm" onClick={()=>setStep((s:1|2|3)=> (s-1) as 1|2|3)}>Atrás</Button>}
            {step<3 && <Button variant="secondary" size="sm" onClick={()=>setStep((s:1|2|3)=> (s+1) as 1|2|3)} disabled={step===1 && piezas.length===0}>Siguiente</Button>}
          </div>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          {step===3 && (
            <Button onClick={handleCreate} disabled={isCreating}>{isCreating?"Creando...":"Crear OT"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
