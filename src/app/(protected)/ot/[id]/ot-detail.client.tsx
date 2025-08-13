"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert } from "@/components/ui/enhanced-alert";
import { ProgressBar } from "@/components/ui/progress-bar";
import { 
  ArrowLeft, 
  Play, 
  Check, 
  AlertTriangle, 
  Package, 
  ShoppingCart, 
  Clock, 
  User,
  Plus
} from "lucide-react";

type Product = { sku: string; nombre: string; uom: string };
type Mat = { id: string; productoId: string; nombre: string; uom: string; qtyPlan: number; qtyEmit: number; qtyPend: number };
type Mov = { id: string; fecha: string|Date; sku: string; nombre: string; uom: string; tipo: string; cantidad: number; costoUnitario: number; importe: number; nota?: string };
type Parte = { id: string; fecha: string|Date; horas: number; maquina?: string; nota?: string; usuario: string };
type Detail = { id: string; codigo: string; estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED"; creadaEn: string|Date; clienteNombre: string|null; notas?: string; materiales: Mat[]; kardex: Mov[]; partes: Parte[] };

type Actions = {
  issueMaterials: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  logProduction: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  createSCFromShortages: (otId: string) => Promise<{ok:boolean; message?:string}>;
  setOTState: (id: string, estado: Detail["estado"]) => Promise<{ok:boolean; message?:string}>;
  addMaterial: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
};

export default function OTDetailClient({ canWrite, detail, products, actions }:{
  canWrite: boolean; detail: Detail; products: Product[]; actions: Actions;
}) {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [horas, setHoras] = useState<number>(1);
  const [maquina, setMaquina] = useState("");
  const [nota, setNota] = useState("");
  const hasAny = useMemo(()=> Object.values(qtys).some(v => Number(v) > 0), [qtys]);
  const faltantes = useMemo(()=> detail.materiales.filter(m=>m.qtyPend>0), [detail.materiales]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            <Link href="/ot" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3 w-3" />
              Volver a Órdenes de Trabajo
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">OT {detail.codigo}</h1>
              <div className="text-lg text-muted-foreground">
                {detail.clienteNombre ?? <span className="italic">Sin cliente asignado</span>}
              </div>
            </div>
            <OTStatusBadge estado={detail.estado} />
          </div>
          {detail.notas && (
            <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">
              {detail.notas}
            </div>
          )}
        </div>
        {canWrite && (
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              onClick={async ()=>{ 
                const r = await actions.setOTState(detail.id, "IN_PROGRESS"); 
                if(r.ok) location.reload(); 
                else toast.error(r.message);
              }} 
              disabled={detail.estado!=="OPEN"}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Iniciar
            </Button>
            <Button 
              variant="outline" 
              onClick={async ()=>{ 
                const r = await actions.setOTState(detail.id, "DONE"); 
                if(r.ok) location.reload();
                else toast.error(r.message);
              }} 
              disabled={detail.estado==="DONE"}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Terminar
            </Button>
            {faltantes.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={async ()=>{ 
                  const r = await actions.createSCFromShortages(detail.id); 
                  if(r.ok) {
                    toast.success("Solicitud de compra creada para faltantes");
                    location.reload();
                  } else {
                    toast.error(r.message || "Error al crear SC");
                  }
                }}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Crear SC Faltantes
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Material Status Alert */}
      {faltantes.length > 0 && (
        <Alert type="warning" title="Materiales Faltantes Detectados">
          Hay {faltantes.length} material(es) con faltantes. Puedes generar una solicitud de compra automáticamente para resolver estos faltantes.
        </Alert>
      )}

      <Tabs defaultValue="materiales">
        <TabsList>
          <TabsTrigger value="materiales">Materiales</TabsTrigger>
          <TabsTrigger value="kardex">Kardex</TabsTrigger>
          <TabsTrigger value="partes">Partes</TabsTrigger>
        </TabsList>

        {/* Materiales */}
        <TabsContent value="materiales" className="space-y-4">
          {canWrite && (
            <Card className="p-3 space-y-2">
              <div className="text-sm text-muted-foreground">Emitir materiales</div>
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
                <div className="col-span-6">Producto</div>
                <div className="col-span-3 text-right">Pendiente</div>
                <div className="col-span-3 text-right">Emitir</div>
              </div>
              <div className="space-y-2 max-h-[45vh] overflow-auto pr-1">
                {detail.materiales.map(m=>(
                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6 truncate" title={`${m.nombre} — ${m.productoId}`}>{m.nombre}</div>
                    <div className="col-span-3 text-right">{m.qtyPend}</div>
                    <div className="col-span-3">
                      <Input type="number" inputMode="decimal" min={0} max={m.qtyPend} step="0.001" placeholder="0"
                        value={qtys[m.productoId] ?? ""} onChange={e=>setQtys(mo => ({ ...mo, [m.productoId]: e.target.value===""? 0 : Number(e.target.value) }))} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={()=>setQtys({})}>Limpiar</Button>
                <Button size="sm" onClick={async ()=>{
                  if (!hasAny) return toast.error("Indica cantidades a emitir");
                  const items = Object.entries(qtys).filter(([,v])=>Number(v)>0).map(([productoId, cantidad])=>({ productoId, cantidad:Number(cantidad) }));
                  const fd = new FormData();
                  fd.set("otId", detail.id);
                  fd.set("items", JSON.stringify(items));
                  const r = await actions.issueMaterials(fd);
                  if (r.ok) { toast.success(r.message || "Emitido"); location.reload(); }
                  else toast.error(r.message);
                }}>Confirmar</Button>
              </div>
            </Card>
          )}

          {canWrite && faltantes.length>0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Faltantes detectados: {faltantes.length}</div>
              <Button variant="outline" onClick={async ()=>{
                const r = await actions.createSCFromShortages(detail.id);
                if (r.ok) toast.success(r.message || "SC creada");
                else toast.error(r.message);
              }}>MRP: Crear SC por faltantes</Button>
            </div>
          )}

          {canWrite && (
            <Card className="p-3 space-y-2">
              <div className="text-sm text-muted-foreground">Agregar material (plan)</div>
              <div className="grid grid-cols-12 gap-2">
                <AddMat products={products} onAdd={async (sku, qty)=>{
                  const fd = new FormData();
                  fd.set("otId", detail.id);
                  fd.set("productoId", sku);
                  fd.set("qtyPlan", String(qty));
                  const r = await actions.addMaterial(fd);
                  if (r.ok) location.reload(); else toast.error(r.message);
                }}/>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Plan</TableHead>
                  <TableHead className="text-right">Emitido</TableHead>
                  <TableHead className="text-right">Pend.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.materiales.map(m=>(
                  <TableRow key={m.id}>
                    <TableCell>{m.nombre} <span className="text-xs text-muted-foreground">({m.productoId})</span></TableCell>
                    <TableCell className="text-right">{m.qtyPlan} {m.uom}</TableCell>
                    <TableCell className="text-right">{m.qtyEmit}</TableCell>
                    <TableCell className={"text-right " + (m.qtyPend>0 ? "text-red-600 font-medium" : "")}>{m.qtyPend}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Kardex */}
        <TabsContent value="kardex" className="space-y-4">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Fecha</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.kardex.map(k=>(
                  <TableRow key={k.id}>
                    <TableCell className="text-sm text-muted-foreground">{new Date(k.fecha).toLocaleString()}</TableCell>
                    <TableCell className="font-mono">{k.sku}</TableCell>
                    <TableCell>{k.nombre}</TableCell>
                    <TableCell className="text-right">{k.cantidad.toFixed(3)}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat(undefined,{style:"currency",currency:"PEN"}).format(k.costoUnitario)}</TableCell>
                    <TableCell className="text-right font-medium">{new Intl.NumberFormat(undefined,{style:"currency",currency:"PEN"}).format(k.importe)}</TableCell>
                    <TableCell className="text-sm">{k.nota ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {detail.kardex.length===0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin movimientos referidos a esta OT</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Partes */}
        <TabsContent value="partes" className="space-y-4">
          {canWrite && (
            <Card className="p-3 space-y-2">
              <div className="text-sm text-muted-foreground">Registrar parte de producción</div>
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <Input type="number" min={0.25} step="0.25" value={horas} onChange={e=>setHoras(Number(e.target.value))} placeholder="Horas" />
                </div>
                <div className="col-span-4">
                  <Input value={maquina} onChange={e=>setMaquina(e.target.value)} placeholder="Máquina (opcional)" />
                </div>
                <div className="col-span-5">
                  <Input value={nota} onChange={e=>setNota(e.target.value)} placeholder="Nota (opcional)" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={async ()=>{
                  const fd = new FormData();
                  fd.set("otId", detail.id);
                  fd.set("horas", String(horas));
                  if (maquina) fd.set("maquina", maquina);
                  if (nota) fd.set("nota", nota);
                  const r = await actions.logProduction(fd);
                  if (r.ok) { toast.success(r.message || "Parte registrado"); setHoras(1); setMaquina(""); setNota(""); location.reload(); }
                  else toast.error(r.message);
                }}>Guardar</Button>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.partes.map(p=>(
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-muted-foreground">{new Date(p.fecha).toLocaleString()}</TableCell>
                    <TableCell>{p.usuario}</TableCell>
                    <TableCell>{p.horas.toFixed(2)}</TableCell>
                    <TableCell>{p.maquina ?? "—"}</TableCell>
                    <TableCell className="text-sm">{p.nota ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {detail.partes.length===0 && (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Sin partes</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddMat({ products, onAdd }:{
  products: Product[];
  onAdd: (sku:string, qty:number)=>void;
}) {
  const [sku, setSku] = useState(products[0]?.sku ?? "");
  const [qty, setQty] = useState<number>(1);
  return (
    <>
      <div className="col-span-8">
        <select className="w-full border rounded-md h-9 px-2" value={sku} onChange={e=>setSku(e.target.value)}>
          {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre} — {p.sku}</option>)}
        </select>
      </div>
      <div className="col-span-3">
        <Input type="number" min={0.001} step="0.001" value={qty} onChange={e=>setQty(Number(e.target.value))} />
      </div>
      <div className="col-span-1 flex justify-end">
        <Button onClick={()=>onAdd(sku, qty)}>+</Button>
      </div>
    </>
  );
}

function OTStatusBadge({ estado }: { estado: Detail["estado"] }) {
  const config: Record<Detail["estado"], { label: string; className: string }> = {
    DRAFT: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
    OPEN: { label: "Abierta", className: "bg-blue-100 text-blue-800" },
    IN_PROGRESS: { label: "En Proceso", className: "bg-indigo-100 text-indigo-800" },
    DONE: { label: "Terminada", className: "bg-green-100 text-green-800" },
    CANCELLED: { label: "Cancelada", className: "bg-red-100 text-red-800" },
  };

  const { label, className } = config[estado];
  return <Badge className={className}>{label}</Badge>;
}
