// src/app/(protected)/ot/ot.client.tsx
"use client";

import { useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { NotificationBubble } from "@/components/ui/notification-bubble";
import { Alert } from "@/components/ui/enhanced-alert";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Search, Package, AlertTriangle, TrendingUp, ShoppingCart, ArrowUpDown, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { PriorityBadge } from "@/components/ot/priority-badge";
import { AcabadoBadge } from "@/components/ot/acabado-badge";
import { NewOTDialog } from "@/components/ot/new-ot-dialog";
import { ClientSelect, type ClientOption } from "@/components/ot/client-select";
import { StatusBadge } from "@/components/ot/status-badge";
import type { OTListRow } from "@/app/server/queries/ot";

type Product = { sku: string; nombre: string; uom: string; categoria?: string };
type OT = OTListRow;

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
  const [items, setItems] = useState<OT[]>(rows as OT[]);
  const [isCreating, setIsCreating] = useState(false);

  const [filterPrioridad, setFilterPrioridad] = useState<"ALL"|"LOW"|"MEDIUM"|"HIGH"|"URGENT">("ALL");
  const [filterClienteId, setFilterClienteId] = useState<string|undefined>(undefined);
  const [quickState, setQuickState] = useState<"ALL"|"SHORTAGE"|"OPEN"|"IN_PROGRESS">("ALL");
  const [sortBy, setSortBy] = useState<"fecha"|"prioridad">("fecha");
  const [sortDir, setSortDir] = useState<"desc"|"asc">("desc");
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  const shortageCount = useMemo(()=> items.filter(r => r.hasShortage).length, [items]);
  const inProgressCount = useMemo(()=> items.filter(r => r.estado === "IN_PROGRESS").length, [items]);
  const openCount = useMemo(()=> items.filter(r => r.estado === "OPEN").length, [items]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    let out = items.filter(o =>
      (!s || o.codigo.toLowerCase().includes(s) || (o.clienteNombre ?? "").toLowerCase().includes(s)
        || o.materiales.some(m => m.nombre.toLowerCase().includes(s) || m.productoId.toLowerCase().includes(s))) &&
      (filterPrioridad === "ALL" || o.prioridad === filterPrioridad) &&
      (!filterClienteId || o.clienteId === filterClienteId) &&
      (
        quickState === "ALL" ||
        (quickState === "SHORTAGE" && o.hasShortage) ||
        (quickState === "OPEN" && o.estado === "OPEN") ||
        (quickState === "IN_PROGRESS" && o.estado === "IN_PROGRESS")
      )
    );

    // orden
    if (sortBy === "prioridad") {
      const rank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
      out = [...out].sort((a,b)=> {
        const pr = rank[a.prioridad] - rank[b.prioridad];
        if (pr !== 0) return pr;
        const da = new Date(a.creadaEn).getTime();
        const db = new Date(b.creadaEn).getTime();
        return sortDir === "desc" ? db - da : da - db;
      });
    } else {
      out = [...out].sort((a,b)=> {
        const da = new Date(a.creadaEn).getTime();
        const db = new Date(b.creadaEn).getTime();
        return sortDir === "desc" ? db - da : da - db;
      });
    }
    return out;
  }, [q, items, filterPrioridad, filterClienteId, quickState, sortBy, sortDir]);

  const shortageCountAll = shortageCount;
  const inProgressCountAll = inProgressCount;
  const openCountAll = openCount;

  const handleCreateOT = async (payload: CreateOTPayload) => {
    setIsCreating(true);
    try {
      const fd = new FormData();
      const piezas = payload.piezas.map(p => ({ productoId: p.sku || null, descripcion: p.descripcion || null, qtyPlan: p.qty }));
      fd.set("piezas", JSON.stringify(piezas));
      const mats = payload.materiales.map(m => ({ productoId: m.sku, qtyPlan: m.qty }));
      fd.set("materiales", JSON.stringify(mats));
      if (payload.clienteId) fd.set("clienteId", payload.clienteId);
      if (payload.cotizacionId) fd.set("cotizacionId", payload.cotizacionId);
      if (payload.notas) fd.set("notas", payload.notas);
      if (payload.prioridad) fd.set("prioridad", payload.prioridad);
      if (payload.acabado) fd.set("acabado", payload.acabado);
      fd.set("autoSC", String(payload.autoSC ?? true));

      const r = await actions.createOT(fd);
      if (r.ok && r.id && r.codigo) {
        const now = new Date();
        const matOptimistic: OT["materiales"] = JSON.parse(fd.get("materiales") as string).map((m: { productoId: string; qtyPlan: number }) => ({
          id: `tmp-${Math.random().toString(36).slice(2)}`,
          productoId: m.productoId,
          nombre: products.find(p=>p.sku===m.productoId)?.nombre || m.productoId,
          uom: products.find(p=>p.sku===m.productoId)?.uom || "u",
          qtyPlan: m.qtyPlan, qtyEmit: 0, qtyPend: m.qtyPlan, stock: 0, faltante: 0,
        }));
        const newOt: OT = {
          id: r.id, codigo: r.codigo, estado: "OPEN",
          prioridad: payload.prioridad || "MEDIUM", creadaEn: now,
          clienteId: payload.clienteId || null,
          clienteNombre: payload.clienteId ? (clients.find(c=>c.id===payload.clienteId)?.nombre || null) : null,
          notas: payload.notas, materiales: matOptimistic,
          hasShortage: false, progresoMateriales: 0, progresoPiezas: 0,
        };
        setItems(prev => [newOt, ...prev]);
        toast.success(`OT ${r.codigo} creada exitosamente`);
        refresh();
      } else if (!r.ok) {
        toast.error(r.message || "Error al crear la OT");
      } else {
        toast.error("Respuesta inesperada al crear OT");
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

      {/* KPIs */}
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
              <div className="text-2xl font-bold">{inProgressCountAll}</div>
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
              <div className="text-2xl font-bold">{shortageCountAll}</div>
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
              <div className="text-2xl font-bold">{openCountAll}</div>
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

      <div className="space-y-4">
          {/* === FILTER BAR (colapsible) === */}
          <Card className="rounded-xl sticky top-2 z-10 border-slate-200 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-sm">
            {/* Header siempre visible */}
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros</span>
                  <span className="text-xs text-muted-foreground">
                    ({filtered.length} de {items.length} órdenes)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="h-8 w-8 p-0"
                >
                  {filtersExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Filtros rápidos siempre visibles */}
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  {key:"ALL", label:"Total", count: items.length, cls:""},
                  {key:"SHORTAGE", label:"Faltantes", count: shortageCountAll, cls:"bg-red-100 text-red-800"},
                  {key:"OPEN", label:"Abiertas", count: openCountAll, cls:"bg-blue-100 text-blue-800"},
                  {key:"IN_PROGRESS", label:"En proceso", count: inProgressCountAll, cls:"bg-indigo-100 text-indigo-800"},
                ] as const).map(chip => (
                  <button
                    key={chip.key}
                    onClick={()=> setQuickState(chip.key as typeof quickState)}
                    className={`px-3 h-7 rounded-full text-xs font-medium border transition
                      ${quickState === chip.key ? "border-foreground/30" : "border-transparent hover:border-foreground/20"} ${chip.cls}`}
                  >
                    {chip.label}
                    <span className="ml-1 opacity-80">{chip.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido expandible */}
            {filtersExpanded && (
              <div className="px-4 pb-4">
                <Separator className="mb-4" />
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr] items-start">
                  {/* Columna izquierda: búsqueda + ordenar */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Código, cliente o material…"
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          className="pl-10 h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Ordenar por</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          className="w-full h-10 border rounded-md px-2"
                          value={sortBy}
                          onChange={e=>setSortBy(e.target.value as "fecha"|"prioridad")}
                        >
                          <option value="fecha">Fecha (recientes primero)</option>
                          <option value="prioridad">Prioridad</option>
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 sm:w-28"
                          onClick={()=> setSortDir(d => d==="desc" ? "asc" : "desc")}
                          title={`Dirección: ${sortDir === "desc" ? "Descendente" : "Ascendente"}`}
                        >
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          {sortDir === "desc" ? "Desc" : "Asc"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Columna derecha: prioridad + cliente + limpiar */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Prioridad</label>
                      <div className="flex flex-wrap gap-2">
                        {(["ALL","URGENT","HIGH","MEDIUM","LOW"] as const).map(p => (
                          <button
                            key={p}
                            onClick={()=>setFilterPrioridad(p)}
                            className={`h-8 px-3 rounded-md border text-sm transition-colors
                              ${filterPrioridad===p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                          >
                            {p==="ALL"?"Todas":p==="URGENT"?"Urgente":p==="HIGH"?"Alta":p==="MEDIUM"?"Media":"Baja"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <ClientSelect clients={clients} value={filterClienteId} onChange={setFilterClienteId} />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        className="h-10"
                        onClick={()=>{
                          setQ("");
                          setFilterPrioridad("ALL");
                          setFilterClienteId(undefined);
                          setQuickState("ALL");
                          setSortBy("fecha");
                          setSortDir("desc");
                        }}
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
          {/* === /FILTER BAR === */}

          {/* Tabla */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Prioridad</TableHead>
                  <TableHead className="text-center">Acabado</TableHead>
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
                    <TableCell className="text-center">
                      {o.acabado ? (
                        <AcabadoBadge acabado={o.acabado} showIcon={false} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin acabado</span>
                      )}
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
                                refresh();
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
      </div>
    </div>
  );
}
