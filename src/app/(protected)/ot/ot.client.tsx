"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { NotificationBubble } from "@/components/ui/notification-bubble";
import { Alert } from "@/components/ui/enhanced-alert";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Search, Package, AlertTriangle, TrendingUp, ShoppingCart } from "lucide-react";
import { PriorityBadge } from "@/components/ot/priority-badge";
import { NewOTDialog } from "@/components/ot/new-ot-dialog";
import { ClientSelect, type ClientOption } from "@/components/ot/client-select";
import { StatusBadge } from "@/components/ot/status-badge";

type Product = { sku: string; nombre: string; uom: string };
type MatRow = { id: string; productoId: string; nombre: string; uom: string; qtyPlan: number; qtyEmit: number; qtyPend: number; stock: number; faltante: number };
type OT = { id: string; codigo: string; estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED"; prioridad: "LOW"|"MEDIUM"|"HIGH"|"URGENT"; creadaEn: string|Date; clienteId: string|null; clienteNombre: string|null; notas?: string; materiales: MatRow[]; hasShortage: boolean };

type CreateOTPayload = {
  piezas: { sku?: string; descripcion?: string; qty: number }[];
  materiales: { sku: string; qty: number }[];
  clienteId?: string;
  cotizacionId?: string;
  notas?: string;
  prioridad?: "LOW"|"MEDIUM"|"HIGH"|"URGENT";
  acabado?: string;
  autoSC?: boolean;
};

type Actions = {
  createOT: (fd: FormData) => Promise<{ok:boolean; message?:string; id?:string; codigo?:string}>;
  setOTState: (id: string, estado: OT["estado"]) => Promise<{ok:boolean; message?:string}>;
  addMaterial: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  issueMaterials: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  createSCFromShortages: (otId: string) => Promise<{ok:boolean; message?:string; id?:string}>;
};

export default function OTClient({ canWrite, rows, products, actions, clients }:{
  canWrite: boolean; rows: OT[]; products: Product[]; actions: Actions; clients: ClientOption[];
}) {
  const [q, setQ] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [filterPrioridad, setFilterPrioridad] = useState<"ALL"|"LOW"|"MEDIUM"|"HIGH"|"URGENT">("ALL");
  const [filterClienteId, setFilterClienteId] = useState<string|undefined>(undefined);
  const [sortBy, setSortBy] = useState<"fecha"|"prioridad">("fecha");
  
  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    let out = rows.filter(o =>
      (!s || o.codigo.toLowerCase().includes(s) || (o.clienteNombre ?? "").toLowerCase().includes(s) || o.materiales.some(m => m.nombre.toLowerCase().includes(s) || m.productoId.toLowerCase().includes(s))) &&
      (filterPrioridad === "ALL" || o.prioridad === filterPrioridad) &&
      (!filterClienteId || o.clienteId === filterClienteId)
    );
    // sort
    if (sortBy === "prioridad") {
      const rank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
      out = [...out].sort((a,b)=> (rank[a.prioridad] - rank[b.prioridad]) || (new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime()));
    } else {
      out = [...out].sort((a,b)=> new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime());
    }
    return out;
  }, [q, rows, filterPrioridad, filterClienteId, sortBy]);

  const shortageCount = useMemo(()=> rows.filter(r => r.hasShortage).length, [rows]);
  const inProgressCount = useMemo(()=> rows.filter(r => r.estado === "IN_PROGRESS").length, [rows]);
  const openCount = useMemo(()=> rows.filter(r => r.estado === "OPEN").length, [rows]);

  const handleCreateOT = async (payload: CreateOTPayload) => {
    setIsCreating(true);
    try {
      const fd = new FormData();
      // piezas
      const piezas = payload.piezas.map(p => ({ productoId: p.sku || null, descripcion: p.descripcion || null, qtyPlan: p.qty }));
      fd.set("piezas", JSON.stringify(piezas));
      // materiales map from sku to productoId
      const mats = payload.materiales.map(m => ({ productoId: m.sku, qtyPlan: m.qty }));
      fd.set("materiales", JSON.stringify(mats));
      if (payload.clienteId) fd.set("clienteId", payload.clienteId);
      if (payload.cotizacionId) fd.set("cotizacionId", payload.cotizacionId);
      if (payload.notas) fd.set("notas", payload.notas);
      if (payload.prioridad) fd.set("prioridad", payload.prioridad);
      if (payload.acabado) fd.set("acabado", payload.acabado);
      fd.set("autoSC", String(payload.autoSC ?? true));
      
      const r = await actions.createOT(fd);
      if (r.ok) { 
        toast.success(`OT ${r.codigo} creada exitosamente`); 
        location.reload(); 
      } else {
        toast.error(r.message || "Error al crear la OT");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h1>
          {shortageCount > 0 && <NotificationBubble count={shortageCount} title="OTs con faltantes de material" />}
        </div>
        {canWrite && (
          <NewOTDialog 
            products={products}
            clients={clients}
            onCreate={handleCreateOT}
            isCreating={isCreating}
          />
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{rows.length}</div>
              <div className="text-sm text-muted-foreground">Total OTs</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{inProgressCount}</div>
              <div className="text-sm text-muted-foreground">En Proceso</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{shortageCount}</div>
              <div className="text-sm text-muted-foreground">Con Faltantes</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{openCount}</div>
              <div className="text-sm text-muted-foreground">Abiertas</div>
            </div>
          </div>
        </Card>
      </div>

      {shortageCount > 0 && (
        <Alert type="warning" title="Órdenes con Faltantes de Material">
          Hay {shortageCount} orden(es) de trabajo con faltantes de material. Revísalas para generar solicitudes de compra automáticamente.
        </Alert>
      )}

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Listado</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          {/* Search Bar */}
          <Card className="p-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por código, cliente o material..." 
                  value={q} 
                  onChange={e=>setQ(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Prioridad</label>
                <div className="flex flex-wrap gap-2">
                  {(["ALL","URGENT","HIGH","MEDIUM","LOW"] as const).map(p => (
                    <button key={p} onClick={()=>setFilterPrioridad(p)}
                      className={`h-9 px-3 rounded-md border text-sm ${filterPrioridad===p?"bg-primary text-primary-foreground border-primary":"hover:bg-muted"}`}>
                      {p==="ALL"?"Todas":p==="URGENT"?"Urgente":p==="HIGH"?"Alta":p==="MEDIUM"?"Media":"Baja"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <ClientSelect clients={clients} value={filterClienteId} onChange={setFilterClienteId} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ordenar por</label>
                <select className="w-full h-9 border rounded-md px-2" value={sortBy} onChange={e=>setSortBy(e.target.value as "fecha"|"prioridad")}>
                  <option value="fecha">Fecha (recientes primero)</option>
                  <option value="prioridad">Prioridad</option>
                </select>
              </div>
              <div className="flex gap-2 lg:justify-end">
                <Button variant="outline" size="sm" onClick={()=>{ setQ(""); setFilterPrioridad("ALL"); setFilterClienteId(undefined); setSortBy("fecha"); }}>Limpiar</Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Badge variant="outline">Total</Badge> {rows.length}</span>
              <span className="inline-flex items-center gap-1"><Badge className="bg-red-100 text-red-800">Faltantes</Badge> {rows.filter(r=>r.hasShortage).length}</span>
              <span className="inline-flex items-center gap-1"><Badge className="bg-blue-100 text-blue-800">Abiertas</Badge> {rows.filter(r=>r.estado==="OPEN").length}</span>
              <span className="inline-flex items-center gap-1"><Badge className="bg-indigo-100 text-indigo-800">En proceso</Badge> {rows.filter(r=>r.estado==="IN_PROGRESS").length}</span>
            </div>
          </Card>

          {/* OT Table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Prioridad</TableHead>
                  <TableHead>Materiales</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(o=>(
                  <TableRow key={o.id} className={o.hasShortage ? "bg-red-50/50" : ""}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <Link href={`/ot/${o.id}`} className="hover:underline font-medium">
                          {o.codigo}
                        </Link>
                        {o.hasShortage && <NotificationBubble count={1} title="Con faltantes" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {o.clienteNombre ?? <span className="text-muted-foreground">Sin cliente</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <PriorityBadge prioridad={o.prioridad} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {o.materiales.slice(0,3).map(m=>(
                          <div key={m.id} className="text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium truncate max-w-32">{m.nombre}</span>
                              <span className="text-muted-foreground">
                                {m.qtyEmit}/{m.qtyPlan} {m.uom}
                              </span>
                            </div>
                            <ProgressBar 
                              value={m.qtyEmit} 
                              max={m.qtyPlan}
                              variant={m.faltante > 0 ? "error" : m.qtyEmit === m.qtyPlan ? "success" : "default"}
                              size="sm"
                              showPercentage={false}
                            />
                            {m.faltante > 0 && (
                              <div className="flex items-center gap-1 text-red-600 mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Falta: {m.faltante} {m.uom}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {o.materiales.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{o.materiales.length - 3} más
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-2">
                        <StatusBadge estado={o.estado} />
                        {o.hasShortage && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Faltantes
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canWrite && o.hasShortage && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                            onClick={async ()=>{
                              const r = await actions.createSCFromShortages(o.id);
                              if (r.ok) {
                                toast.success(`Solicitud de compra creada exitosamente`);
                                location.reload();
                              } else {
                                toast.error(r.message || "Error al crear SC");
                              }
                            }}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            SC
                          </Button>
                        )}
                        <Link href={`/ot/${o.id}`}>
                          <Button size="sm" variant="ghost">
                            Ver Detalle
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
        {filtered.length === 0 && (
                  <TableRow>
          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {q ? "No se encontraron OTs que coincidan con la búsqueda" : "No hay órdenes de trabajo"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
