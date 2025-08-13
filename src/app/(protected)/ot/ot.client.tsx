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
import { Search, Package, AlertTriangle, TrendingUp, ShoppingCart, Plus } from "lucide-react";

type Product = { sku: string; nombre: string; uom: string };
type MatRow = { id: string; productoId: string; nombre: string; uom: string; qtyPlan: number; qtyEmit: number; qtyPend: number; stock: number; faltante: number };
type OT = { id: string; codigo: string; estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED"; creadaEn: string|Date; clienteNombre: string|null; notas?: string; materiales: MatRow[]; hasShortage: boolean };

type CreateOTPayload = {
  materiales: { sku: string; qty: number }[];
  clienteId?: string;
  cotizacionId?: string;
  notas?: string;
};

type Actions = {
  createOT: (fd: FormData) => Promise<{ok:boolean; message?:string; id?:string; codigo?:string}>;
  setOTState: (id: string, estado: OT["estado"]) => Promise<{ok:boolean; message?:string}>;
  addMaterial: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  issueMaterials: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  createSCFromShortages: (otId: string) => Promise<{ok:boolean; message?:string; id?:string}>;
};

export default function OTClient({ canWrite, rows, products, actions }:{
  canWrite: boolean; rows: OT[]; products: Product[]; actions: Actions;
}) {
  const [q, setQ] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if(!s) return rows;
    return rows.filter(o =>
      o.codigo.toLowerCase().includes(s) ||
      (o.clienteNombre ?? "").toLowerCase().includes(s) ||
      o.materiales.some(m => m.nombre.toLowerCase().includes(s) || m.productoId.toLowerCase().includes(s))
    );
  }, [q, rows]);

  const shortageCount = useMemo(()=> rows.filter(r => r.hasShortage).length, [rows]);
  const inProgressCount = useMemo(()=> rows.filter(r => r.estado === "IN_PROGRESS").length, [rows]);
  const openCount = useMemo(()=> rows.filter(r => r.estado === "OPEN").length, [rows]);

  const handleCreateOT = async (payload: CreateOTPayload) => {
    setIsCreating(true);
    try {
      const fd = new FormData();
      fd.set("materiales", JSON.stringify(payload.materiales));
      if (payload.clienteId) fd.set("clienteId", payload.clienteId);
      if (payload.cotizacionId) fd.set("cotizacionId", payload.cotizacionId);
      if (payload.notas) fd.set("notas", payload.notas);
      
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
          <NewOTButton 
            products={products} 
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
          <Card className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por código, cliente o material..." 
                value={q} 
                onChange={e=>setQ(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {/* OT Table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
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
                      <OTBadge estado={o.estado} warn={o.hasShortage} />
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
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
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

function OTBadge({ estado, warn }: { estado: OT["estado"]; warn?: boolean }) {
  const classes: Record<OT["estado"], string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-indigo-100 text-indigo-800",
    DONE: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  
  const labels: Record<OT["estado"], string> = {
    DRAFT: "Borrador",
    OPEN: "Abierta",
    IN_PROGRESS: "En Proceso",
    DONE: "Terminada",
    CANCELLED: "Cancelada",
  };
  
  return (
    <div className="inline-flex items-center gap-2">
      <Badge className={classes[estado]}>{labels[estado]}</Badge>
      {warn && (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Faltantes
        </Badge>
      )}
    </div>
  );
}

function NewOTButton({ 
  products, 
  onCreate, 
  isCreating = false 
}: {
  products: Product[]; 
  onCreate: (payload: CreateOTPayload) => Promise<void>;
  isCreating?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [materiales, setMateriales] = useState<{sku: string; qty: number}[]>([]);
  const [notas, setNotas] = useState("");

  const handleSubmit = async () => {
    if (materiales.length === 0) {
      toast.error("Agrega al menos un material");
      return;
    }

    try {
      await onCreate({
        materiales: materiales.filter(m => m.qty > 0),
        notas: notas.trim() || undefined,
      });
      setIsOpen(false);
      setMateriales([]);
      setNotas("");
    } catch {
      toast.error("Error al crear la OT");
    }
  };

  const addMaterial = () => {
    setMateriales([...materiales, { sku: "", qty: 1 }]);
  };

  const updateMaterial = (index: number, field: 'sku' | 'qty', value: string | number) => {
    const newMateriales = [...materiales];
    newMateriales[index] = { ...newMateriales[index], [field]: value };
    setMateriales(newMateriales);
  };

  const removeMaterial = (index: number) => {
    setMateriales(materiales.filter((_, i) => i !== index));
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} disabled={isCreating}>
        <Plus className="h-4 w-4 mr-2" />
        Nueva OT
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Nueva Orden de Trabajo</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>×</Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Descripción de la orden..."
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Materiales</label>
                <Button size="sm" variant="outline" onClick={addMaterial}>
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
              
              <div className="space-y-2">
                {materiales.map((m, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={m.sku}
                      onChange={(e) => updateMaterial(i, 'sku', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md"
                    >
                      <option value="">Selecciona producto...</option>
                      {products.map(p => (
                        <option key={p.sku} value={p.sku}>
                          {p.nombre} ({p.sku})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="1"
                      value={m.qty}
                      onChange={(e) => updateMaterial(i, 'qty', Number(e.target.value))}
                      className="w-20"
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeMaterial(i)}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || materiales.length === 0}>
              {isCreating ? "Creando..." : "Crear OT"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
