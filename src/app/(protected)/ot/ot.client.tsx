"use client";

import { useMemo, useState, useEffect, useCallback, startTransition } from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

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
  fechaLimite?: string;
};

type Actions = {
  createOT: (fd: FormData) => Promise<{ok:boolean; message?:string; id?:string; codigo?:string}>;
  setOTState: (id: string, estado: OT["estado"]) => Promise<{ok:boolean; message?:string}>;
  addMaterial: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  issueMaterials: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  createSCFromShortages: (otId: string) => Promise<{ok:boolean; message?:string; id?:string}>;
};

export default function OTClient({ canWrite, rows, products, actions, clients, prioridadOptions, acabadoOptions, currency }:{
  canWrite: boolean; rows: OT[]; products: Product[]; actions: Actions; clients: ClientOption[];
  prioridadOptions?: { value: string; label: string }[];
  acabadoOptions?: { value: string; label: string }[];
  currency: string;
}) {
  const [q, setQ] = useState("");
  // items: current page rows from server
  const [items, setItems] = useState<OT[]>([]);
  const [total, setTotal] = useState<number>(rows.length);
  // loading state removed (not currently used)
  const [isCreating, setIsCreating] = useState(false);

  const [filterPrioridad, setFilterPrioridad] = useState<"ALL"|"LOW"|"MEDIUM"|"HIGH"|"URGENT">("ALL");
  const [filterClienteId, setFilterClienteId] = useState<string|undefined>(undefined);
  const [quickState, setQuickState] = useState<"ALL"|"SHORTAGE"|"OPEN"|"IN_PROGRESS">("ALL");
  const [sortBy, setSortBy] = useState<"fecha"|"prioridad">("fecha");
  const [sortDir, setSortDir] = useState<"desc"|"asc">("desc");
  // Por defecto minimizamos el panel de filtros para reducir clutter en la UI
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  // Paginación cliente
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  // counts over all rows (server provided via initial prop `rows`)
  const shortageCountAll = useMemo(()=> rows.filter(r => r.hasShortage).length, [rows]);
  const inProgressCountAll = useMemo(()=> rows.filter(r => r.estado === "IN_PROGRESS").length, [rows]);
  const openCountAll = useMemo(()=> rows.filter(r => r.estado === "OPEN").length, [rows]);
  // counts on current page
  const shortageCount = useMemo(()=> items.filter(r => r.hasShortage).length, [items]);
  // page-level counts (kept for possible future use)
  // const inProgressCount = useMemo(()=> items.filter(r => r.estado === "IN_PROGRESS").length, [items]);
  // const openCount = useMemo(()=> items.filter(r => r.estado === "OPEN").length, [items]);

  // filtered = current page items filtered by quickState only (other filters are applied server-side)
  const filtered = useMemo(()=>{
    return items.filter(o =>
      quickState === "ALL" ||
      (quickState === "SHORTAGE" && o.hasShortage) ||
      (quickState === "OPEN" && o.estado === "OPEN") ||
      (quickState === "IN_PROGRESS" && o.estado === "IN_PROGRESS")
    );
  }, [items, quickState]);

  // Paginación server-side: total provisto por la API
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const pageItems = filtered; // already page rows from server

  // keep previous names for compatibility

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
  if (payload.fechaLimite) fd.set("fechaLimite", payload.fechaLimite);
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
          fechaLimite: payload.fechaLimite ? new Date(payload.fechaLimite as string) : null,
        };
        setItems(prev => [newOt, ...prev]);
        toast.success(`OT ${r.codigo} creada exitosamente`);
        refresh();
  // reload first page after creating
  fetchPage(1);
      } else if (!r.ok) {
        toast.error(r.message || "Error al crear la OT");
      } else {
        toast.error("Respuesta inesperada al crear OT");
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch paginated data from API
  const fetchPage = useCallback(async (p = page) => {
    const controller = new AbortController();
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(pageSize));
      if (q) params.set('q', q);
      if (filterPrioridad && filterPrioridad !== 'ALL') params.set('prioridad', filterPrioridad);
      if (filterClienteId) params.set('clienteId', filterClienteId);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDir) params.set('sortDir', sortDir);

      const res = await fetch(`/api/ots?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json.rows || []);
      setTotal(typeof json.total === 'number' ? json.total : (rows.length ?? 0));
      setPage(p);
    } catch {
      // ignore abort / errors for now
    }
  }, [pageSize, q, filterPrioridad, filterClienteId, sortBy, sortDir, rows.length, page]);

  // initial load
  useEffect(() => { fetchPage(1); }, [fetchPage]);

  // refetch when relevant filters change
  useEffect(() => {
    setPage(1);
    fetchPage(1);
  }, [q, pageSize, filterPrioridad, filterClienteId, sortBy, sortDir, fetchPage]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h1>
            {shortageCount > 0 && <NotificationBubble count={shortageCount} title="OTs con faltantes de material" />}
          </div>
          <span className="text-sm text-muted-foreground select-none border rounded px-2 py-0.5 bg-muted/40">
            Moneda: <strong>{currency}</strong>
          </span>
        </div>
        {canWrite && (
          <NewOTDialog
            products={products}
            clients={clients}
            onCreate={handleCreateOT}
            isCreating={isCreating}
            prioridadOptions={prioridadOptions}
            acabadoOptions={acabadoOptions}
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
                  <TableHead>Fecha Límite</TableHead>
                  <TableHead className="text-center">Prioridad</TableHead>
                  <TableHead className="text-center">Acabado</TableHead>
                  <TableHead>Materiales</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(o=>(
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
                      {o.fechaLimite ? (
                        <span className="text-sm">
                          {new Date(o.fechaLimite).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <PriorityBadge prioridad={o.prioridad} options={prioridadOptions} />
                    </TableCell>
                    <TableCell className="text-center">
                      {o.acabado ? (
                        <AcabadoBadge acabado={o.acabado} showIcon={false} options={acabadoOptions} />
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
          {/* Paginación */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar</span>
              <select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 border rounded px-2 text-sm">
                {[10,20,50].map(n=>(<option key={n} value={n}>{n}</option>))}
              </select>
              <span className="text-sm text-muted-foreground">entradas</span>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={()=> fetchPage(Math.max(1, page-1))} />
                </PaginationItem>
                {/* Pages simple: mostrar prev/current/next */}
                <PaginationItem>
                  <PaginationLink>{page} / {totalPages}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={()=> fetchPage(Math.min(totalPages, page+1))} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
      </div>
    </div>
  );
}
