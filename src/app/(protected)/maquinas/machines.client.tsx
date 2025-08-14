"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Row = {
  id: string; codigo: string; nombre: string; categoria?: string|null; estado: "ACTIVA"|"MANTENIMIENTO"|"BAJA";
  ubicacion?: string|null; horasUlt30d: number; pendMant: number;
  ultimoEvento?: { tipo: string; inicio: string|Date|null; fin?: string|Date|null } | null;
  fabricante?: string|null; modelo?: string|null; serie?: string|null; capacidad?: string|null; notas?: string|null;
};

type OTMini = { id: string; codigo: string };

type Actions = {
  upsertMachine: (fd: FormData)=>Promise<{ok:boolean; message?:string; id?:string}>;
  deleteMachine: (id: string)=>Promise<{ok:boolean; message?:string}>;
  logMachineEvent: (fd: FormData)=>Promise<{ok:boolean; message?:string; id?:string}>;
  scheduleMaintenance: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
  closeMaintenance: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
};

export default function MachinesClient({ canWrite, rows, ots, actions }:{
  canWrite: boolean; rows: Row[]; ots: OTMini[]; actions: Actions;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(()=> {
    const s = q.trim().toLowerCase();
    return rows.filter(r =>
      !s || r.codigo.toLowerCase().includes(s) || r.nombre.toLowerCase().includes(s) ||
      (r.categoria ?? "").toLowerCase().includes(s) || (r.ubicacion ?? "").toLowerCase().includes(s)
    );
  }, [q, rows]);

  // form state (crear/editar)
  const [form, setForm] = useState<Partial<Row>>({});

  // quick log hours
  const [selMachine, setSelMachine] = useState<string>(rows[0]?.id ?? "");
  const [selOT, setSelOT] = useState<string>(ots[0]?.id ?? "");
  const [horas, setHoras] = useState<number>(1);
  const [nota, setNota] = useState("");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Maquinarias</h1>
        {canWrite && (
          <Button onClick={()=>setForm({})}><Plus className="h-4 w-4 mr-1" /> Nueva máquina</Button>
        )}
      </div>

      {/* Registro rápido de horas (impacta también en OT) */}
      {canWrite && (
        <Card className="p-4 space-y-2">
          <div className="font-semibold">Registro rápido de horas (USO)</div>
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Máquina</label>
              <select className="w-full h-9 border rounded-md px-2" value={selMachine} onChange={e=>setSelMachine(e.target.value)}>
                {rows.map(m => <option key={m.id} value={m.id}>{m.nombre} — {m.codigo}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">OT</label>
              <select className="w-full h-9 border rounded-md px-2" value={selOT} onChange={e=>setSelOT(e.target.value)}>
                {ots.map(o => <option key={o.id} value={o.id}>{o.codigo}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1 block">Horas</label>
              <Input type="number" min={0.25} step="0.25" value={horas} onChange={e=>setHoras(Number(e.target.value))} />
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Nota (opcional)</label>
              <Input value={nota} onChange={e=>setNota(e.target.value)} placeholder="Operación realizada…" />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                onClick={async ()=>{
                  const fd = new FormData();
                  fd.set("maquinaId", selMachine);
                  fd.set("tipo", "USO");
                  fd.set("horas", String(horas));
                  fd.set("otId", selOT);
                  if (nota.trim()) fd.set("nota", nota.trim());
                  const p = actions.logMachineEvent(fd);
                  await toast.promise(p, {
                    loading: "Registrando…",
                    success: (r)=> r.message || "Evento registrado",
                    error: (e)=> e?.message || "No se pudo registrar",
                  });
                  setHoras(1); setNota("");
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Input placeholder="Buscar por código, nombre, categoría o ubicación…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Horas 30d</TableHead>
              <TableHead className="text-right">Mant. pend.</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-mono">{m.codigo}</TableCell>
                <TableCell>
                  <Link href={`/maquinas/${m.id}`} className="font-medium hover:underline">{m.nombre}</Link>
                </TableCell>
                <TableCell>{m.categoria ?? "—"}</TableCell>
                <TableCell>{m.ubicacion ?? "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={m.estado==="ACTIVA"?"secondary":m.estado==="MANTENIMIENTO"?"default":"outline"}>
                    {m.estado==="ACTIVA"?"Activa":m.estado==="MANTENIMIENTO"?"Mantenimiento":"Baja"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{m.horasUlt30d.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono">{m.pendMant}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {canWrite && (
                      <>
                        <Button size="sm" variant="outline" onClick={()=>setForm(m)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={async ()=>{
                          const p = actions.deleteMachine(m.id);
                          await toast.promise(p, { loading: "Eliminando…", success: (r)=>r.message||"OK", error: (e)=>e?.message||"Error" });
                        }}>Eliminar</Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length===0 && (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Form crear/editar */}
      {canWrite && (
        <Card className="p-4 space-y-3">
          <div className="font-semibold">{form?.id ? "Editar máquina" : "Nueva máquina"}</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3"><Input placeholder="Código" value={form.codigo ?? ""} onChange={e=>setForm(f=>({...f, codigo: e.target.value}))} /></div>
            <div className="col-span-4"><Input placeholder="Nombre" value={form.nombre ?? ""} onChange={e=>setForm(f=>({...f, nombre: e.target.value}))} /></div>
            <div className="col-span-3"><Input placeholder="Categoría" value={form.categoria ?? ""} onChange={e=>setForm(f=>({...f, categoria: e.target.value}))} /></div>
            <div className="col-span-2">
              <select className="w-full h-9 border rounded-md px-2" value={form.estado ?? "ACTIVA"} onChange={e=>setForm(f=>({...f, estado: e.target.value as Row["estado"]}))}>
                <option value="ACTIVA">Activa</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <div className="col-span-3"><Input placeholder="Ubicación" value={form.ubicacion ?? ""} onChange={e=>setForm(f=>({...f, ubicacion: e.target.value}))} /></div>
            <div className="col-span-3"><Input placeholder="Fabricante" value={form.fabricante ?? ""} onChange={e=>setForm(f=>({...f, fabricante: e.target.value}))} /></div>
            <div className="col-span-3"><Input placeholder="Modelo" value={form.modelo ?? ""} onChange={e=>setForm(f=>({...f, modelo: e.target.value}))} /></div>
            <div className="col-span-3"><Input placeholder="Serie" value={form.serie ?? ""} onChange={e=>setForm(f=>({...f, serie: e.target.value}))} /></div>
            <div className="col-span-3"><Input placeholder="Capacidad" value={form.capacidad ?? ""} onChange={e=>setForm(f=>({...f, capacidad: e.target.value}))} /></div>
            <div className="col-span-9"><Input placeholder="Notas" value={form.notas ?? ""} onChange={e=>setForm(f=>({...f, notas: e.target.value}))} /></div>
          </div>
          <div className="flex justify-end">
            <Button onClick={async ()=>{
              const fd = new FormData();
              if (form.id) fd.set("id", form.id);
              fd.set("codigo", form.codigo ?? "");
              fd.set("nombre", form.nombre ?? "");
              if (form.categoria) fd.set("categoria", String(form.categoria));
              fd.set("estado", (form.estado ?? "ACTIVA") as string);
              if (form.ubicacion) fd.set("ubicacion", String(form.ubicacion));
              if (form.fabricante) fd.set("fabricante", String(form.fabricante));
              if (form.modelo) fd.set("modelo", String(form.modelo));
              if (form.serie) fd.set("serie", String(form.serie));
              if (form.capacidad) fd.set("capacidad", String(form.capacidad));
              if (form.notas) fd.set("notas", String(form.notas));
              const p = actions.upsertMachine(fd);
              await toast.promise(p, { loading: "Guardando…", success: (r)=>r.message||"OK", error: (e)=>e?.message||"Error" });
              setForm({});
            }}>Guardar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
