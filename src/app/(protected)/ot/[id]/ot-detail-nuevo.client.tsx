"use client";

import { useMemo, useState, startTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert } from "@/components/ui/enhanced-alert";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ArrowLeft, Play, Check, ShoppingCart, Copy, Link as LinkIcon, FileText, Edit3, Clock, History } from "lucide-react";
import { PriorityBadge } from "@/components/ot/priority-badge";
import { StatusBadge } from "@/components/ot/status-badge";
import { PrioritySelect } from "@/components/ot/priority-select";
import { ClientSelect, type ClientOption } from "@/components/ot/client-select";
import { useRouter } from "next/navigation";

type Mat = { id: string; productoId: string; nombre: string; uom: string; qtyPlan: number; qtyEmit: number; qtyPend: number };
type Mov = { id: string; fecha: string|Date; sku: string; nombre: string; uom: string; tipo: string; cantidad: number; costoUnitario: number; importe: number; nota?: string };
type Parte = { id: string; fecha: string|Date; horas: number; maquina?: string; nota?: string; usuario: string };
type Pieza = { id: string; productoId?: string; descripcion?: string; qtyPlan: number; qtyHecha: number };
type Detail = { 
  id: string; codigo: string; estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED"; 
  prioridad: "LOW"|"MEDIUM"|"HIGH"|"URGENT"; creadaEn: string|Date; clienteNombre: string|null; 
  notas?: string; materiales: Mat[]; piezas: Pieza[]; kardex: Mov[]; partes: Parte[];
  acabado?: string;
};

type Actions = {
  issueMaterials: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  logProduction: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  logFinishedPieces?: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  createSCFromShortages: (otId: string) => Promise<{ok:boolean; message?:string}>;
  setOTState: (id: string, estado: Detail["estado"]) => Promise<{ok:boolean; message?:string}>;
  addMaterial: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  updateOTMeta: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
};

export default function OTDetailClient({ canWrite, detail, actions, clients }:{
  canWrite: boolean; detail: Detail; actions: Actions; clients: ClientOption[];
}) {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [piezaQtys, setPiezaQtys] = useState<Record<string, number>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"produccion"|"materiales"|"historial">("produccion");
  
  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  // Estados de edición mejorados
  const [editClienteId, setEditClienteId] = useState<string|undefined>(
    detail.clienteNombre ? clients.find(c => c.nombre === detail.clienteNombre)?.id : undefined
  );
  const [editPrioridad, setEditPrioridad] = useState<"LOW"|"MEDIUM"|"HIGH"|"URGENT">(detail.prioridad);
  const [editNotas, setEditNotas] = useState<string>(detail.notas ?? "");

  const faltantes = useMemo(()=> detail.materiales.filter(m=>m.qtyPend>0), [detail.materiales]);
  
  const totalesMateriales = useMemo(()=>{
    const plan = detail.materiales.reduce((s,m)=> s + Number(m.qtyPlan), 0);
    const emit = detail.materiales.reduce((s,m)=> s + Number(m.qtyEmit), 0);
    return { plan, emit, pend: plan - emit };
  }, [detail.materiales]);

  const totalesPiezas = useMemo(()=>{
    const plan = detail.piezas.reduce((s,p)=> s + Number(p.qtyPlan), 0);
    const hecho = detail.piezas.reduce((s,p)=> s + Number(p.qtyHecha), 0);
    return { plan, hecho, pend: Math.max(0, plan - hecho) };
  }, [detail.piezas]);

  const canStart = detail.estado === "OPEN";
  const canFinish = detail.estado !== "DONE" && detail.estado !== "CANCELLED";
  const inProgress = detail.estado === "IN_PROGRESS";

  const saveMeta = async () => {
    const fd = new FormData();
    fd.set("otId", detail.id);
    if (editClienteId !== undefined) fd.set("clienteId", editClienteId ?? "");
    fd.set("prioridad", editPrioridad);
    fd.set("notas", editNotas.trim());
    const r = await actions.updateOTMeta(fd);
    if (r.ok) { 
      toast.success("OT actualizada"); 
      setIsEditing(false);
      refresh();
    } else {
      toast.error(r.message);
    }
  };

  const emitMaterials = async (items: {productoId: string; cantidad: number}[]) => {
    const fd = new FormData();
    fd.set("otId", detail.id);
    fd.set("items", JSON.stringify(items));
    const r = await actions.issueMaterials(fd);
    if (r.ok) { 
      toast.success(r.message || "Materiales emitidos"); 
      setQtys({});
      refresh();
    } else {
      toast.error(r.message);
    }
  };

  const logPiezas = async (items: {piezaId: string; cantidad: number}[]) => {
    if (!actions.logFinishedPieces) return;
    const fd = new FormData();
    fd.set("otId", detail.id);
    fd.set("items", JSON.stringify(items));
    const r = await actions.logFinishedPieces(fd);
    if (r.ok) {
      toast.success("Producción registrada");
      setPiezaQtys({});
  startTransition(() => router.refresh());
    } else {
      toast.error(r.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mejorado */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/ot" className="flex items-center gap-1 hover:underline hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Órdenes de Trabajo
            </Link>
            <span>/</span>
            <span>OT {detail.codigo}</span>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">OT {detail.codigo}</h1>
                <StatusBadge estado={detail.estado} />
                <PriorityBadge prioridad={detail.prioridad} />
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={async ()=> {
                    await navigator.clipboard.writeText(detail.codigo);
                    toast.success("Código copiado");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              {!isEditing ? (
                <div className="space-y-2">
                  <div className="text-muted-foreground">
                    <span className="font-medium">Cliente:</span> {detail.clienteNombre ?? <span className="italic">Sin asignar</span>}
                  </div>
                  {detail.acabado && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Acabado:</span> {detail.acabado}
                    </div>
                  )}
                  {detail.notas && (
                    <div className="text-sm bg-blue-50 p-2 rounded-md border-l-4 border-blue-200">
                      <span className="font-medium text-blue-900">Nota:</span> 
                      <span className="text-blue-800">&ldquo;{detail.notas}&rdquo;</span>
                    </div>
                  )}
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-3 w-3 mr-1" />
                      Editar información
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-medium text-gray-900">Editar información de la OT</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Cliente</label>
                      <ClientSelect clients={clients} value={editClienteId} onChange={setEditClienteId} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Prioridad</label>
                      <PrioritySelect value={editPrioridad} onChange={setEditPrioridad} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Notas e indicaciones</label>
                    <Input 
                      value={editNotas} 
                      onChange={e=>setEditNotas(e.target.value)} 
                      placeholder="Notas e indicaciones especiales..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveMeta}>Guardar cambios</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setIsEditing(false);
                      setEditClienteId(detail.clienteNombre ? clients.find(c => c.nombre === detail.clienteNombre)?.id : undefined);
                      setEditPrioridad(detail.prioridad);
                      setEditNotas(detail.notas ?? "");
                    }}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Panel de acciones simplificado */}
            {canWrite && (
              <div className="flex flex-col gap-2 ml-6">
                {canStart && (
                  <Button 
                    onClick={async ()=>{ 
                      const r = await actions.setOTState(detail.id, "IN_PROGRESS"); 
                      if (r.ok) { toast.success(r.message || "OT iniciada"); refresh(); } else toast.error(r.message || "No se pudo iniciar la OT");
                    }}
                    className="whitespace-nowrap"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar OT
                  </Button>
                )}
                {canFinish && inProgress && (
                  <Button 
                    variant="secondary"
                    onClick={async ()=>{ 
                      const r = await actions.setOTState(detail.id, "DONE"); 
                      if (r.ok) { toast.success(r.message || "OT finalizada"); refresh(); } else toast.error(r.message || "No se pudo finalizar la OT");
                    }}
                    className="whitespace-nowrap"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar OT
                  </Button>
                )}
                {faltantes.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={async ()=>{ 
                      const r = await actions.createSCFromShortages(detail.id); 
                      if (r.ok) { toast.success("Solicitud de compra creada"); refresh(); } else { toast.error(r.message || "Error al crear SC"); }
                    }}
                    className="whitespace-nowrap"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Crear SC
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      <div className="p-6 space-y-4">
        {faltantes.length > 0 && (
          <Alert type="warning" title="Materiales Faltantes">
            Hay {faltantes.length} material(es) con faltantes de stock. Genera una solicitud de compra para continuar.
          </Alert>
        )}
        
        {detail.estado === "DRAFT" && (
          <Alert type="info" title="OT en Borrador">
            Esta orden está en estado borrador. Necesita ser abierta para comenzar la producción.
          </Alert>
        )}
      </div>

      {/* Dashboard principal */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Resumen de Materiales */}
          <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => setActiveTab("materiales")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                📦 Materiales
              </h3>
              <span className="text-sm text-muted-foreground font-mono">
                {totalesMateriales.emit} / {totalesMateriales.plan}
              </span>
            </div>
            <ProgressBar 
              value={totalesMateriales.emit} 
              max={Math.max(1, totalesMateriales.plan)} 
              variant={faltantes.length > 0 ? "error" : totalesMateriales.emit === totalesMateriales.plan ? "success" : "default"}
              className="mb-3"
            />
            <div className="text-sm text-muted-foreground">
              {totalesMateriales.pend > 0 ? (
                <>
                  <span className="text-orange-600 font-medium">{totalesMateriales.pend} pendientes</span> de emitir
                </>
              ) : (
                <span className="text-green-600 font-medium">✓ Todos los materiales emitidos</span>
              )}
              {faltantes.length > 0 && (
                <> • <span className="text-red-600 font-medium">{faltantes.length} con faltantes</span></>
              )}
            </div>
          </Card>

          {/* Resumen de Piezas */}
          <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("produccion")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                🔧 Producción
              </h3>
              <span className="text-sm text-muted-foreground font-mono">
                {totalesPiezas.hecho} / {totalesPiezas.plan}
              </span>
            </div>
            <ProgressBar 
              value={totalesPiezas.hecho} 
              max={Math.max(1, totalesPiezas.plan)} 
              variant={totalesPiezas.hecho === totalesPiezas.plan ? "success" : "default"}
              className="mb-3"
            />
            <div className="text-sm text-muted-foreground">
              {totalesPiezas.pend > 0 ? (
                <>
                  <span className="text-blue-600 font-medium">{totalesPiezas.pend} piezas pendientes</span> de producir
                </>
              ) : (
                <span className="text-green-600 font-medium">✓ Producción completada</span>
              )}
            </div>
          </Card>
        </div>

        {/* Tabs mejoradas */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "produccion"|"materiales"|"historial")}>
          <TabsList className="mb-6">
            <TabsTrigger value="produccion" className="flex items-center gap-2">
              🔧 Producción
            </TabsTrigger>
            <TabsTrigger value="materiales" className="flex items-center gap-2">
              📦 Materiales
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Tab Producción */}
          <TabsContent value="produccion" className="space-y-6">
            {detail.piezas.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay piezas definidas en esta OT</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Panel de registro de producción */}
                {canWrite && inProgress && actions.logFinishedPieces && (
                  <Card className="p-4 bg-green-50 border-green-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      ✅ Registrar Producción Completada
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {detail.piezas.map(p => {
                        const remaining = Math.max(0, p.qtyPlan - p.qtyHecha);
                        if (remaining === 0) return null;
                        return (
                          <div key={p.id} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              {p.productoId ? 
                                <LinkIcon className="h-3 w-3 text-green-600" /> : 
                                <FileText className="h-3 w-3 text-blue-600" />
                              }
                              <span className="font-medium truncate">{p.descripcion || p.productoId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                min={0} 
                                max={remaining}
                                placeholder={`máx ${remaining}`}
                                value={piezaQtys[p.id] || ""} 
                                onChange={e => setPiezaQtys(prev => ({
                                  ...prev,
                                  [p.id]: e.target.value === "" ? 0 : Number(e.target.value)
                                }))}
                                className="h-8"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                de {remaining}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button 
                        size="sm"
                        onClick={() => {
                          const items = Object.entries(piezaQtys)
                            .filter(([, qty]) => Number(qty) > 0)
                            .map(([piezaId, cantidad]) => ({ piezaId, cantidad: Number(cantidad) }));
                          
                          if (items.length === 0) {
                            toast.error("Indica las cantidades terminadas");
                            return;
                          }
                          logPiezas(items);
                        }}
                        disabled={Object.values(piezaQtys).every(v => !v || v === 0)}
                      >
                        Registrar Producción
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Lista de piezas */}
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Pieza</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-right">Planificado</TableHead>
                        <TableHead className="text-right">Producido</TableHead>
                        <TableHead className="text-right">Progreso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.piezas.map(p => {
                        const pct = p.qtyPlan > 0 ? Math.min(100, (p.qtyHecha / p.qtyPlan) * 100) : 0;
                        const linked = !!p.productoId;
                        const pending = Math.max(0, p.qtyPlan - p.qtyHecha);
                        
                        return (
                          <TableRow key={p.id} className={pending === 0 ? "bg-green-50" : ""}>
                            <TableCell className="max-w-64">
                              <div className="flex items-center gap-2">
                                {linked ? 
                                  <LinkIcon className="h-4 w-4 text-green-600" /> : 
                                  <FileText className="h-4 w-4 text-blue-600" />
                                }
                                <span className="truncate font-medium" title={p.descripcion || p.productoId}>
                                  {p.descripcion || p.productoId || '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${
                                linked 
                                  ? 'bg-green-50 text-green-700 border-green-300' 
                                  : 'bg-blue-50 text-blue-700 border-blue-300'
                              }`}>
                                {linked ? 'Producto' : 'Libre'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">{p.qtyPlan}</TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {p.qtyHecha}
                              {pending > 0 && <span className="text-muted-foreground text-xs ml-1">({pending} pend.)</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className={`text-sm font-medium tabular-nums ${pct === 100 ? 'text-green-600' : ''}`}>
                                  {pct.toFixed(0)}%
                                </div>
                                <div className="w-20 h-1.5 rounded bg-muted overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${pct === 100 ? 'bg-green-600' : 'bg-blue-600'}`} 
                                    style={{ width: pct+"%" }} 
                                  />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Tab Materiales */}
          <TabsContent value="materiales" className="space-y-6">
            {/* Panel de emisión */}
            {canWrite && inProgress && (
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    📤 Emitir Materiales para Producción
                  </h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={()=>setQtys({})}>
                      Limpiar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => {
                        const items = detail.materiales
                          .filter(m => m.qtyPend > 0)
                          .map(m => ({ productoId: m.productoId, cantidad: m.qtyPend }));
                        if (items.length === 0) {
                          toast.info("No hay materiales pendientes");
                          return;
                        }
                        emitMaterials(items);
                      }}
                    >
                      Emitir Todo Pendiente
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-auto">
                  {detail.materiales.filter(m => m.qtyPend > 0).map(m => (
                    <div key={m.id} className="grid grid-cols-12 gap-3 items-center p-2 bg-white rounded border">
                      <div className="col-span-6 truncate" title={`${m.nombre} (${m.productoId})`}>
                        <div className="font-medium">{m.nombre}</div>
                        <div className="text-xs text-muted-foreground">{m.productoId}</div>
                      </div>
                      <div className="col-span-3 text-right">
                        <div className="font-medium">{m.qtyPend}</div>
                        <div className="text-xs text-muted-foreground">{m.uom} pend.</div>
                      </div>
                      <div className="col-span-3">
                        <Input 
                          type="number" 
                          inputMode="decimal" 
                          min={0} 
                          max={m.qtyPend} 
                          step="0.001" 
                          placeholder="Cantidad"
                          value={qtys[m.productoId] ?? ""} 
                          onChange={e => setQtys(prev => ({ 
                            ...prev, 
                            [m.productoId]: e.target.value === "" ? 0 : Number(e.target.value) 
                          }))} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    size="sm"
                    onClick={() => {
                      const items = Object.entries(qtys)
                        .filter(([, v]) => Number(v) > 0)
                        .map(([productoId, cantidad]) => ({ productoId, cantidad: Number(cantidad) }));
                      
                      if (items.length === 0) {
                        toast.error("Indica las cantidades a emitir");
                        return;
                      }
                      emitMaterials(items);
                    }}
                    disabled={!Object.values(qtys).some(v => Number(v) > 0)}
                  >
                    Confirmar Emisión
                  </Button>
                </div>
              </Card>
            )}

            {/* Tabla de materiales */}
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Planificado</TableHead>
                    <TableHead className="text-right">Emitido</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.materiales.map(m => (
                    <TableRow key={m.id} className={m.qtyPend === 0 ? "bg-green-50" : m.qtyPend > 0 && faltantes.some(f => f.id === m.id) ? "bg-red-50" : ""}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{m.nombre}</div>
                          <div className="text-xs text-muted-foreground">SKU: {m.productoId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{m.qtyPlan} {m.uom}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{m.qtyEmit} {m.uom}</TableCell>
                      <TableCell className={`text-right font-mono ${m.qtyPend > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
                        {m.qtyPend} {m.uom}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.qtyPend === 0 ? (
                          <span className="text-green-600 font-medium">✓ Completo</span>
                        ) : faltantes.some(f => f.id === m.id) ? (
                          <span className="text-red-600 font-medium">⚠ Faltante</span>
                        ) : (
                          <span className="text-orange-600 font-medium">⏳ Pendiente</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tab Historial */}
          <TabsContent value="historial" className="space-y-6">
            <Tabs defaultValue="movimientos">
              <TabsList>
                <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
                <TabsTrigger value="partes">Partes de Trabajo</TabsTrigger>
              </TabsList>

              <TabsContent value="movimientos">
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.kardex.map(k=>(
                        <TableRow key={k.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(k.fecha).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{k.nombre}</div>
                              <div className="text-xs text-muted-foreground">{k.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${k.cantidad < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {k.cantidad > 0 ? '+' : ''}{k.cantidad.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {new Intl.NumberFormat(undefined,{style:"currency",currency:"PEN"}).format(k.importe)}
                          </TableCell>
                          <TableCell className="text-sm">{k.nota ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                      {detail.kardex.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                            No hay movimientos registrados para esta OT
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="partes">
                {canWrite && inProgress && (
                  <Card className="p-4 bg-blue-50 border-blue-200 mb-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Registrar Parte de Trabajo
                    </h4>
                    <RegistrarParteForm otId={detail.id} onSubmit={actions.logProduction} />
                  </Card>
                )}

                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Operario</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                        <TableHead>Máquina</TableHead>
                        <TableHead>Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.partes.map(p=>(
                        <TableRow key={p.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(p.fecha).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{p.usuario}</TableCell>
                          <TableCell className="text-right font-mono">{p.horas.toFixed(2)}h</TableCell>
                          <TableCell>{p.maquina ?? "—"}</TableCell>
                          <TableCell className="text-sm">{p.nota ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                      {detail.partes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                            No hay partes de trabajo registrados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Componente para registrar partes
function RegistrarParteForm({ otId, onSubmit }: { 
  otId: string; 
  onSubmit: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
}) {
  const [horas, setHoras] = useState<number>(1);
  const [maquina, setMaquina] = useState("");
  const [nota, setNota] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    const fd = new FormData();
    fd.set("otId", otId);
    fd.set("horas", String(horas));
    if (maquina.trim()) fd.set("maquina", maquina.trim());
    if (nota.trim()) fd.set("nota", nota.trim());
    
    const r = await onSubmit(fd);
    if (r.ok) { 
      toast.success("Parte registrado"); 
      setHoras(1); 
      setMaquina(""); 
      setNota(""); 
      startTransition(() => router.refresh());
    } else {
      toast.error(r.message);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-3 items-end">
      <div className="col-span-2">
        <label className="text-xs font-medium text-gray-700 mb-1 block">Horas</label>
        <Input 
          type="number" 
          min={0.25} 
          step="0.25" 
          value={horas} 
          onChange={e=>setHoras(Number(e.target.value))} 
        />
      </div>
      <div className="col-span-4">
        <label className="text-xs font-medium text-gray-700 mb-1 block">Máquina (opcional)</label>
        <Input 
          value={maquina} 
          onChange={e=>setMaquina(e.target.value)} 
          placeholder="Ej: Torno CNC #1" 
        />
      </div>
      <div className="col-span-5">
        <label className="text-xs font-medium text-gray-700 mb-1 block">Observaciones (opcional)</label>
        <Input 
          value={nota} 
          onChange={e=>setNota(e.target.value)} 
          placeholder="Operación realizada..." 
        />
      </div>
      <div className="col-span-1">
        <Button size="sm" onClick={handleSubmit}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
