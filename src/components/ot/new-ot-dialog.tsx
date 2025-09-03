"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Plus, Hammer, Layers } from "lucide-react";
import { ClientSelect, ClientOption } from "@/components/ot/client-select";
import { PrioritySelect } from "@/components/ot/priority-select";
import { ACABADO_OPTIONS } from "./acabado-constants";
import { toast } from "sonner";

export type NewOTDialogPayload = {
  piezas: { sku?: string; descripcion?: string; qty: number }[];
  materiales: { sku: string; qty: number }[];
  clienteId?: string;
  cotizacionId?: string;
  notas?: string;
  prioridad?: "LOW"|"MEDIUM"|"HIGH"|"URGENT";
  acabado?: string; // valores permitidos: NONE | TROPICALIZADO | PINTADO | ZINCADO (frontend guarda string legible)
  fechaLimite?: string; // ISO date string (YYYY-MM-DD) o Date ISO
};

interface Product { sku: string; nombre: string; uom: string; categoria?: string }

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
  const [acabado, setAcabado] = useState("NONE");
  const [notas, setNotas] = useState("");
  const [fechaLimite, setFechaLimite] = useState<string>("");

  const reset = () => {
    setStep(1);
    setPiezas([{ qty: 1 }]);
    setMateriales([]);
    setClienteId(undefined);
    setPrioridad("MEDIUM");
  setAcabado("NONE");
    setNotas("");
  setFechaLimite("");
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
  acabado: acabado === "NONE" ? undefined : acabado,
      notas: notas.trim() || undefined,
  fechaLimite: fechaLimite ? new Date(fechaLimite).toISOString() : undefined,
    });
    reset();
    setOpen(false);
  };

  // Piezas handlers
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
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Hammer className="h-6 w-6 text-primary" />
            </div>
            Nueva Orden de Trabajo
          </DialogTitle>
        </DialogHeader>
        
        {/* Step Navigator */}
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-4">
            {[
              { num: 1, title: "General", icon: "📋" },
              { num: 2, title: "Materiales", icon: "📦" },
              { num: 3, title: "Finalizar", icon: "✅" }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200
                  ${step === s.num 
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105' 
                    : step > s.num 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }
                `}>
                  <span className="text-lg">{s.icon}</span>
                  <div className="text-left">
                    <div className="text-xs font-medium opacity-75">Paso {s.num}</div>
                    <div className="text-sm font-semibold">{s.title}</div>
                  </div>
                </div>
                {idx < 2 && (
                  <div className={`w-8 h-0.5 mx-2 ${step > s.num ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-1">
          {step===1 && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    👤 Cliente
                  </label>
                  <ClientSelect clients={clients} value={clienteId} onChange={setClienteId} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    🎯 Prioridad
                  </label>
                  <PrioritySelect value={prioridad} onChange={setPrioridad} />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Hammer className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">Piezas a fabricar</h3>
                    <p className="text-sm text-blue-700">Solo productos categoría FABRICACIÓN</p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mb-4 bg-blue-100 p-3 rounded-lg">
                  💡 Ingresa manualmente las piezas. No se descuenta inventario ahora, solo planifica la producción.
                </p>
                <div className="space-y-4">
                  {piezas.map((p,i)=>{
                    const piezasFabricacion = products.filter(pr => (pr.categoria||"").toUpperCase()==="FABRICACION");
                    return (
                    <div key={i} className="bg-white border border-blue-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        <div className="lg:col-span-3">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">SKU (opcional)</label>
                          <select className="w-full h-10 border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={p.sku||""} onChange={e=>updatePieza(i,'sku',e.target.value)}>
                            <option value="">Seleccionar SKU...</option>
                            {piezasFabricacion.map(pr => <option key={pr.sku} value={pr.sku}>{pr.nombre} ({pr.sku})</option>)}
                          </select>
                        </div>
                        <div className="lg:col-span-7">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                          <Input 
                            placeholder="Describe la pieza a fabricar..." 
                            value={p.descripcion||""} 
                            onChange={e=>updatePieza(i,'descripcion',e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Cantidad</label>
                          <Input 
                            type="number" 
                            min={1} 
                            value={p.qty} 
                            onChange={e=>updatePieza(i,'qty',Number(e.target.value))}
                            className="h-10 text-center"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={()=>removePieza(i)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>
                    </div>
                  )})}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={addPieza}
                    className="w-full border-dashed border-2 h-12 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Añadir pieza
                  </Button>
                </div>
              </div>
            </div>
          )}
          {step===2 && (
            <div className="space-y-6 py-2">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Layers className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">Materiales Planificados</h3>
                      <p className="text-sm text-green-700">Todas las categorías excepto FABRICACIÓN</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={addMaterial}
                    className="bg-white hover:bg-green-50 border-green-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />Agregar
                  </Button>
                </div>
                <p className="text-xs text-green-600 mb-4 bg-green-100 p-3 rounded-lg">
                  📋 Estos materiales se usarán para verificar cobertura y faltantes (la SC es manual desde el detalle).
                </p>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {materiales.map((m,i)=>{
                    const materialesOpts = products.filter(pr => (pr.categoria||"").toUpperCase() !== "FABRICACION");
                    return (
                    <div key={i} className="bg-white border border-green-200 rounded-lg p-4">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Producto</label>
                          <select 
                            value={m.sku} 
                            onChange={e=>updateMaterial(i,'sku',e.target.value)} 
                            className="w-full h-10 border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="">Seleccionar producto...</option>
                            {materialesOpts.map(p=> (
                              <option key={p.sku} value={p.sku}>
                                {p.nombre} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Cantidad</label>
                          <Input 
                            type="number" 
                            min={1} 
                            value={m.qty} 
                            onChange={e=>updateMaterial(i,'qty',Number(e.target.value))} 
                            className="h-10 text-center"
                            placeholder="0"
                          />
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={()=>removeMaterial(i)}
                          className="h-10 w-10 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  )})}
                  {materiales.length===0 && (
                    <div className="text-center py-8 text-green-600">
                      <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sin materiales planificados aún</p>
                      <p className="text-xs opacity-75">Haz clic en &ldquo;Agregar&rdquo; para añadir materiales</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {step===3 && (
            <div className="space-y-6 py-2">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Hammer className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900">Detalles finales</h3>
                    <p className="text-sm text-purple-700">Configura los parámetros adicionales</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      📅 Fecha límite de entrega
                    </label>
                    <DateTimePicker
                      value={fechaLimite || undefined}
                      onChange={(iso)=> setFechaLimite(iso || "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      ✨ Acabado
                    </label>
                    <select 
                      className="w-full h-10 border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                      value={acabado} 
                      onChange={e=>setAcabado(e.target.value)}
                    >
                      {ACABADO_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      📝 Notas
                    </label>
                    <Input 
                      value={notas} 
                      onChange={e=>setNotas(e.target.value)} 
                      placeholder="Observaciones adicionales sobre la orden..."
                      className="h-12"
                    />
                  </div>
                </div>
              </div>
              
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Hammer className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">Resumen de la orden</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/70 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {piezas.filter(p=> (p.sku||p.descripcion)&&p.qty>0).length}
                    </div>
                    <div className="text-sm text-blue-700 font-medium">Pieza(s) válidas</div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {materiales.filter(m=>m.sku&&m.qty>0).length}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Material(es) planificados</div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4 text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {prioridad === 'LOW' ? '🔵 Baja' : 
                       prioridad === 'MEDIUM' ? '🟡 Media' : 
                       prioridad === 'HIGH' ? '🟠 Alta' : '🔴 Urgente'}
                    </div>
                    <div className="text-sm text-purple-700 font-medium">Prioridad</div>
                  </div>
                </div>
                {(acabado && acabado !== "NONE") && (
                  <div className="mt-4 bg-white/70 rounded-lg p-3 text-center">
                    <span className="text-sm text-gray-700">
                      <strong>Acabado:</strong> {ACABADO_OPTIONS.find(a => a.value === acabado)?.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-6 border-t pt-4">
          <div className="flex flex-col sm:flex-row justify-between w-full gap-3">
            <div className="flex gap-2">
              {step > 1 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={()=>setStep((s:1|2|3)=> (s-1) as 1|2|3)}
                  className="flex items-center gap-2"
                >
                  ← Atrás
                </Button>
              )}
              {step < 3 && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={()=>setStep((s:1|2|3)=> (s+1) as 1|2|3)} 
                  disabled={step===1 && piezas.filter(p=> (p.sku||p.descripcion)&&p.qty>0).length === 0}
                  className="flex items-center gap-2"
                >
                  Siguiente →
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              {step === 3 && (
                <Button 
                  onClick={handleCreate} 
                  disabled={isCreating}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      ✅ Crear OT
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
