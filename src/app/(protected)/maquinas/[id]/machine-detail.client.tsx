"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Detail = Awaited<ReturnType<typeof import("@/app/server/queries/machines").getMachineDetail>>;
type Actions = {
  scheduleMaintenance: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
  closeMaintenance: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
  upsertMachine: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
};

export default function MachineDetailClient({ canWrite, detail, actions }:{
  canWrite: boolean;
  detail: NonNullable<Detail>;
  actions: Actions;
}) {
  const m = detail.maquina;

  // programar mantenimiento
  const today = new Date().toISOString().slice(0,10);

  return (
    <div className="p-6 space-y-6">
      <div className="text-sm text-muted-foreground">
        <Link href="/maquinas" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-3 w-3" /> Volver</Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {m.nombre} <span className="text-muted-foreground font-mono">({m.codigo})</span>
          </h1>
          <div className="text-sm text-muted-foreground">{m.categoria ?? "—"} · {m.ubicacion ?? "sin ubicación"}</div>
          <div className="mt-2 text-sm">Estado: <strong>{m.estado}</strong></div>
        </div>
      </div>

      {/* KPIs y serie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="font-semibold mb-3">Horas últimos 30 días</div>
          <div className="text-3xl font-bold">{detail.kpis.horas30d.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">Uso aprox.: {detail.kpis.usoPctAprox.toFixed(0)}%</div>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-3">Mantenimientos pendientes</div>
          <div className="text-3xl font-bold">{detail.kpis.pendMant}</div>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-3">Serie (30 días)</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.serie30d as { day:string; horas:number }[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="horas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Agenda mantenimiento */}
      {canWrite && (
        <Card className="p-4 space-y-3">
          <div className="font-semibold">Mantenimiento</div>
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <label className="text-xs font-medium block mb-1">Tipo</label>
              <Input defaultValue="PREVENTIVO" id="tipoMant" />
            </div>
            <div className="col-span-4">
              <label className="text-xs font-medium block mb-1">Fecha programada</label>
              <Input type="date" defaultValue={today} id="fechaProg" />
            </div>
            <div className="col-span-4 flex justify-end">
              <Button onClick={async ()=>{
                const fd = new FormData();
                fd.set("maquinaId", m.id);
                fd.set("tipo", (document.getElementById("tipoMant") as HTMLInputElement).value || "PREVENTIVO");
                fd.set("fechaProg", new Date((document.getElementById("fechaProg") as HTMLInputElement).value || today).toISOString());
                const p = actions.scheduleMaintenance(fd);
                await toast.promise(p, { loading: "Programando…", success: "Programado", error: "Error" });
              }}>Programar</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Historial de eventos */}
      <Card className="overflow-hidden">
        <div className="p-4 font-semibold">Eventos recientes</div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.eventos.map(e=>(
              <TableRow key={e.id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(e.inicio).toLocaleString()}</TableCell>
                <TableCell>{e.tipo}</TableCell>
                <TableCell className="font-mono">{e.ot?.codigo ?? "—"}</TableCell>
                <TableCell className="font-mono">{Number(e.horas || 0).toFixed(2)}</TableCell>
                <TableCell>{e.usuario?.displayName ?? e.usuario?.email ?? "—"}</TableCell>
                <TableCell className="text-sm">{e.nota ?? "—"}</TableCell>
              </TableRow>
            ))}
            {detail.eventos.length===0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin eventos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Agenda de mantenimiento */}
      <Card className="overflow-hidden">
        <div className="p-4 font-semibold">Mantenimientos</div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Programado</TableHead>
              <TableHead>Real</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.mantenimientos.map(mm=>(
              <TableRow key={mm.id}>
                <TableCell>{mm.tipo}</TableCell>
                <TableCell>{mm.estado}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(mm.fechaProg).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{mm.fechaReal ? new Date(mm.fechaReal).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="font-mono">{Number(mm.costo || 0).toFixed(2)}</TableCell>
                <TableCell className="text-sm">{mm.nota ?? "—"}</TableCell>
                <TableCell className="text-center">
                  {canWrite && mm.estado === "PENDIENTE" && (
                    <Button size="sm" variant="outline" onClick={async ()=>{
                      const fd = new FormData();
                      fd.set("id", mm.id);
                      const p = actions.closeMaintenance(fd);
                      await toast.promise(p, { loading: "Cerrando…", success: "Cerrado", error: "Error" });
                    }}>Cerrar</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {detail.mantenimientos.length===0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
