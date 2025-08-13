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

type Product = { sku: string; nombre: string; uom: string };
type MatRow = { id: string; productoId: string; nombre: string; uom: string; qtyPlan: number; qtyEmit: number; qtyPend: number; stock: number; faltante: number };
type OT = { id: string; codigo: string; estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED"; creadaEn: string|Date; clienteNombre: string|null; notas?: string; materiales: MatRow[]; hasShortage: boolean };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h1>
          <NotificationBubble count={shortageCount} title="OTs con faltantes" />
        </div>
        {canWrite && <NewOTButton products={products} onCreate={async (payload)=>{
          const fd = new FormData();
          fd.set("materiales", JSON.stringify(payload.materiales));
          if (payload.clienteId) fd.set("clienteId", payload.clienteId);
          if (payload.cotizacionId) fd.set("cotizacionId", payload.cotizacionId);
          if (payload.notas) fd.set("notas", payload.notas);
          const r = await actions.createOT(fd);
          if (r.ok) { toast.success(r.message || "OT creada"); location.reload(); }
          else toast.error(r.message);
        }}/>}
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Listado</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <Card className="p-4 flex items-center gap-3 max-w-lg">
            <Input placeholder="Buscar por código, cliente o SKU..." value={q} onChange={e=>setQ(e.target.value)} />
          </Card>

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
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">
                      <Link href={`/ot/${o.id}`} className="hover:underline">{o.codigo}</Link>
                      {o.hasShortage && <NotificationBubble count={1} title="Faltantes" />}
                    </TableCell>
                    <TableCell>{o.clienteNombre ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {o.materiales.slice(0,3).map(m=>(
                          <div key={m.id} className={m.faltante>0 ? "text-red-600" : ""}>
                            {m.nombre} · pend {m.qtyPend} — stock {m.stock}
                          </div>
                        ))}
                        {o.materiales.length>3 && <div className="text-[10px] text-muted-foreground">… {o.materiales.length-3} más</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <OTBadge estado={o.estado} warn={o.hasShortage} />
                    </TableCell>
                    <TableCell className="text-center">
                      {canWrite && o.hasShortage && (
                        <Button size="sm" variant="outline" onClick={async ()=>{
                          const r = await actions.createSCFromShortages(o.id);
                          if (r.ok) { toast.success(r.message || "SC creada"); }
                          else toast.error(r.message);
                        }}>MRP: SC faltantes</Button>
                      )}
                      {" "}
                      <Link className="text-sm underline" href={`/ot/${o.id}`}>Detalle</Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length===0 && (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Sin OTs</TableCell></TableRow>
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
  return (
    <div className="inline-flex items-center gap-2">
      <Badge className={classes[estado]}>{estado.replace("_"," ")}</Badge>
      {warn && <Badge className="bg-red-100 text-red-800">Faltantes</Badge>}
    </div>
  );
}

function NewOTButton({ products, onCreate }:{
  products: Product[];
  onCreate: (p:{clienteId?:string; cotizacionId?:string; notas?:string; materiales: Array<{productoId:string; qtyPlan:number}>})=>void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Array<{productoId:string; qtyPlan:number}>>([]);
  const addRow = () => setRows(r=>[...r, { productoId: products[0]?.sku ?? "", qtyPlan: 1 }]);
  const setRow = (i:number, patch: Partial<{productoId:string; qtyPlan:number}>) => setRows(rs=>rs.map((r,idx)=> idx===i ? { ...r, ...patch } : r));
  const removeRow = (i:number) => setRows(rs=>rs.filter((_,idx)=>idx!==i));

  return (
    <>
      <Button onClick={()=>setOpen(true)}>Nueva OT</Button>
      {open && (
        <Card className="p-4 fixed bottom-4 right-4 w-[min(95vw,700px)] shadow-xl border space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Nueva Orden de Trabajo</div>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cerrar</Button>
          </div>
          <div className="space-y-2 max-h-[45vh] overflow-auto pr-1">
            {rows.map((r,idx)=>(
              <div key={idx} className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <select className="w-full border rounded-md h-9 px-2" value={r.productoId} onChange={e=>setRow(idx,{ productoId:e.target.value })}>
                    {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre} — {p.sku}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <Input type="number" min={0.001} step="0.001" value={r.qtyPlan} onChange={e=>setRow(idx,{ qtyPlan:Number(e.target.value) })}/>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button variant="outline" onClick={()=>removeRow(idx)}>—</Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addRow}>Agregar material</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
            <Button onClick={()=>{ if(rows.length===0) return toast.error("Agrega al menos un material"); onCreate({ materiales: rows }); }}>
              Crear
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
