"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Hammer, Wrench, Play, FilePlus2, Edit3 } from "lucide-react";
import { StatusBadge, EstadoOT } from "@/components/ot/status-badge";
import { PriorityBadge, Prioridad } from "@/components/ot/priority-badge";
import EditHeaderDialog from "../../../../components/ot/edit-header-dialog";
import EmitMaterialsDialog from "../../../../components/ot/emit-materials-dialog";
import RequestSCDialog from "../../../../components/ot/request-sc-dialog";

type Detail = Awaited<ReturnType<typeof import("@/app/server/queries/ot").getOTDetail>>;
type ProductsMini = Awaited<ReturnType<typeof import("@/app/server/queries/ot").getProductsMini>>;
type ClientsMini = Awaited<ReturnType<typeof import("@/app/server/queries/ot").getClientsMini>>;

type Actions = {
  updateOTHeader: (payload: {
    id: string;
    clienteId?: string | null;
    prioridad?: "LOW"|"MEDIUM"|"HIGH"|"URGENT";
    notas?: string;
    acabado?: string;
    materialesPlan?: { sku: string; qtyPlan: number }[];
  })=>Promise<{ok:boolean; message?:string}>;
  emitOTMaterials: (payload: { otId: string; items: { sku: string; qty: number }[] })=>Promise<{ok:boolean; message?:string}>;
  startOTManually: (payload: { otId: string })=>Promise<{ok:boolean; message?:string}>;
  createManualSCForOT: (payload: { otId: string; nota?: string })=>Promise<{ok:boolean; message?:string}>;
  recompute: (otId: string)=>Promise<void>;
};

export default function OTDetailClient({
  canWrite,
  detail,
  products,
  clients,
  actions
}:{
  canWrite: boolean;
  detail: NonNullable<Detail>;
  products: ProductsMini;
  clients: ClientsMini;
  actions: Actions;
}) {
  const { ot, kpis } = detail;
  const [openEdit, setOpenEdit] = useState(false);
  const [openEmit, setOpenEmit] = useState(false);
  const [openSC, setOpenSC] = useState(false);

  const coveragePct = Math.round(kpis.progresoMateriales * 100);
  const piezasPct = Math.round(kpis.progresoPiezas * 100);

  const canStart = canWrite && (coveragePct >= 20) && (ot.estado === "OPEN" || ot.estado === "DRAFT");

  const matsPlan = useMemo(()=> ot.materiales.map(m=>({
    sku: m.productoId,
    nombre: m.producto?.nombre ?? m.productoId,
    uom: m.producto?.uom ?? "",
    plan: Number(m.qtyPlan || 0),
    emit: Number(m.qtyEmit || 0),
    pend: Math.max(Number(m.qtyPlan || 0) - Number(m.qtyEmit || 0), 0),
  })), [ot.materiales]);

  const piezasRows = useMemo(()=> ot.piezas.map(p=>({
    id: p.id,
    desc: p.descripcion || p.productoId || "Pieza",
    plan: Number(p.qtyPlan || 0),
    hecha: Number(p.qtyHecha || 0),
    pend: Math.max(Number(p.qtyPlan || 0) - Number(p.qtyHecha || 0), 0),
  })), [ot.piezas]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hammer className="h-5 w-5" /> {ot.codigo}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge estado={ot.estado as EstadoOT} />
            <PriorityBadge prioridad={ot.prioridad as Prioridad} />
            {ot.cliente && <Badge variant="outline">{ot.cliente.nombre}</Badge>}
          </div>
          {ot.notas && <div className="text-sm text-muted-foreground mt-1">{ot.notas}</div>}
          {ot.acabado && <div className="text-xs text-muted-foreground">Acabado: {ot.acabado}</div>}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setOpenEdit(true)}>
              <Edit3 className="h-4 w-4 mr-1" /> Editar cabecera / plan
            </Button>
            <Button variant="outline" onClick={()=>setOpenEmit(true)}>
              <Wrench className="h-4 w-4 mr-1" /> Emitir materiales
            </Button>
            <Button variant="outline" onClick={()=>setOpenSC(true)}>
              <FilePlus2 className="h-4 w-4 mr-1" /> Solicitar faltante
            </Button>
            <Button onClick={async ()=>{
              const p = actions.startOTManually({ otId: ot.id });
              await toast.promise(p, { loading: "Validando…", success: (r)=> r.message || "OT iniciada", error: (e)=> e?.message || "No se pudo iniciar" });
              await actions.recompute(ot.id);
            }} disabled={!canStart}>
              <Play className="h-4 w-4 mr-1" /> Iniciar OT
            </Button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Progreso materiales</div>
          <div className="text-2xl font-bold">{coveragePct}%</div>
          <div className="h-2 bg-muted rounded mt-2">
            <div className="h-2 bg-blue-600 rounded" style={{ width: `${coveragePct}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Progreso piezas</div>
          <div className="text-2xl font-bold">{piezasPct}%</div>
          <div className="h-2 bg-muted rounded mt-2">
            <div className="h-2 bg-green-600 rounded" style={{ width: `${piezasPct}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pzas. pendientes</div>
          <div className="text-2xl font-bold">{kpis.piezasPend}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Material faltante</div>
          <div className="text-2xl font-bold">{kpis.matsPend}</div>
        </Card>
      </div>

      {/* Materiales */}
      <Card className="overflow-hidden">
        <div className="p-4 font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Materiales planificados</div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Plan</TableHead>
              <TableHead className="text-right">Emitido</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead>UOM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matsPlan.map(r=>(
              <TableRow key={r.sku}>
                <TableCell className="font-mono">{r.nombre} <span className="text-muted-foreground">({r.sku})</span></TableCell>
                <TableCell className="text-right font-mono">{r.plan}</TableCell>
                <TableCell className="text-right font-mono">{r.emit}</TableCell>
                <TableCell className="text-right font-mono">{r.pend}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.uom}</TableCell>
              </TableRow>
            ))}
            {matsPlan.length===0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Sin materiales planificados</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {/* Piezas */}
      <Card className="overflow-hidden">
        <div className="p-4 font-semibold">Piezas</div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Plan</TableHead>
              <TableHead className="text-right">Hecha</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {piezasRows.map(p=>(
              <TableRow key={p.id}>
                <TableCell>{p.desc}</TableCell>
                <TableCell className="text-right font-mono">{p.plan}</TableCell>
                <TableCell className="text-right font-mono">{p.hecha}</TableCell>
                <TableCell className="text-right font-mono">{p.pend}</TableCell>
              </TableRow>
            ))}
            {piezasRows.length===0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Sin piezas</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="p-3 text-xs text-muted-foreground border-t">
          * Esta sección es informativa. El registro de producción y horas se hace en el módulo de <strong>Control de Producción</strong>.
        </div>
      </Card>

      {/* Partes (solo lectura) */}
      <Card className="overflow-hidden">
        <div className="p-4 font-semibold">Partes de producción (informativo)</div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead>Pieza</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ot.partesProduccion.map(pp=>(
              <TableRow key={pp.id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(pp.fecha).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{pp.usuario?.displayName ?? pp.usuario?.email ?? "—"}</TableCell>
                <TableCell className="text-sm">{pp.maquina ?? "—"}</TableCell>
                <TableCell className="text-right font-mono">{Number(pp.horas || 0).toFixed(2)}</TableCell>
                <TableCell className="text-sm">{pp.pieza?.descripcion ?? pp.pieza?.productoId ?? "—"}</TableCell>
                <TableCell className="text-sm">{pp.nota ?? "—"}</TableCell>
              </TableRow>
            ))}
            {ot.partesProduccion.length===0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin partes</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modales */}
      {canWrite && (
        <>
          <EditHeaderDialog
            open={openEdit}
            onOpenChange={setOpenEdit}
            ot={ot}
            products={products}
            clients={clients}
            onSave={async (payload: Parameters<Actions["updateOTHeader"]>[0])=>{
              const p = actions.updateOTHeader(payload);
              await toast.promise(p, { loading: "Guardando…", success: (r)=> r.message || "Actualizado", error: "Error" });
              await actions.recompute(ot.id);
            }}
          />
          <EmitMaterialsDialog
            open={openEmit}
            onOpenChange={setOpenEmit}
            materials={matsPlan}
            products={products}
            onEmit={async (items: { sku: string; qty: number }[])=>{
              const p = actions.emitOTMaterials({ otId: ot.id, items });
              await toast.promise(p, { loading: "Emitiendo…", success: (r)=> r.message || "Materiales emitidos", error: "Error" });
              await actions.recompute(ot.id);
            }}
          />
          <RequestSCDialog
            open={openSC}
            onOpenChange={setOpenSC}
            onConfirm={async (nota?: string)=>{
              const p = actions.createManualSCForOT({ otId: ot.id, nota });
              await toast.promise(p, { loading: "Creando solicitud…", success: (r)=> r.message || "Solicitud de compra creada", error: "Error" });
            }}
          />
        </>
      )}
    </div>
  );
}
