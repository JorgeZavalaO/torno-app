"use client";

import { useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Factory, Users2, Timer, CheckCircle, Wrench } from "lucide-react";
import { PriorityBadge } from "@/components/ot/priority-badge";
import { StatusBadge } from "@/components/ot/status-badge";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

type SeriePoint = { day: string; horas: number };
type MachineRow = { maquina: string; horas: number };
type OperatorRow = { usuario: string; horas: number };
type WIPRow = {
  id: string;
  codigo: string;
  estado: "OPEN" | "IN_PROGRESS" | "DRAFT" | "DONE" | "CANCELLED"; // se reciben más estados, filtramos visualmente
  prioridad: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  clienteNombre: string | null;
  piezasPlan: number;
  piezasHechas: number;
  avancePct: number;
  creadaEn: string | Date;
};

type Overview = {
  series: SeriePoint[];
  machines: MachineRow[];
  operators: OperatorRow[];
  wip: WIPRow[];
  kpis: {
    horasUlt7d: number;
    horasHoy: number;
    otsOpen: number;
    otsInProgress: number;
    piezasPlan: number;
    piezasHechas: number;
    avanceGlobalPct: number;
  };
  from: Date;
  until: Date;
};

type QuickLog = {
  ots: { id: string; codigo: string; estado: "OPEN"|"IN_PROGRESS"|"DRAFT"|"DONE"|"CANCELLED"; piezas: { id: string; titulo: string; pend: number }[] }[];
};

type Actions = {
  logProduction: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  logFinishedPieces: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
};

export default function ControlClient({
  canWrite,
  overview,
  quicklog,
  actions,
}: {
  canWrite: boolean;
  overview: Overview;
  quicklog: QuickLog;
  actions: Actions;
}) {
  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  const [otHoras, setOtHoras] = useState<string>(quicklog.ots[0]?.id ?? "");
  const [horas, setHoras] = useState<number>(1);
  const [maquina, setMaquina] = useState("");
  const [nota, setNota] = useState("");

  const piezasDeOTSel = useMemo(() => {
    const x = quicklog.ots.find((o) => o.id === otHoras);
    return x?.piezas ?? [];
  }, [quicklog.ots, otHoras]);

  const [piezaSel, setPiezaSel] = useState<string>("");
  const [qtyFin, setQtyFin] = useState<number>(1);

  const wipSorted = useMemo(
    () => [...overview.wip].sort((a, b) => b.avancePct - a.avancePct),
    [overview.wip]
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Control de Producción</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI icon={<Timer className="h-5 w-5" />} title="Horas (hoy)" value={overview.kpis.horasHoy.toFixed(2)} />
        <KPI icon={<TrendingUp className="h-5 w-5" />} title="Horas (últimos 7 días)" value={overview.kpis.horasUlt7d.toFixed(2)} />
        <KPI icon={<Factory className="h-5 w-5" />} title="OTs en proceso" value={String(overview.kpis.otsInProgress)} />
        <KPI icon={<Wrench className="h-5 w-5" />} title="OTs abiertas" value={String(overview.kpis.otsOpen)} />
        <KPI icon={<CheckCircle className="h-5 w-5" />} title="Avance global" value={`${overview.kpis.avanceGlobalPct.toFixed(0)}%`} />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="wip">WIP</TabsTrigger>
          <TabsTrigger value="registros">Registro rápido</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="p-4">
              <div className="font-semibold mb-3">Horas por día (14d)</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview.series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="horas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-3 flex items-center gap-2">
                Top máquinas <Badge variant="outline"><Factory className="h-3 w-3 mr-1" />{overview.machines.length}</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.machines}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="maquina" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="horas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-3 flex items-center gap-2">
                Top operadores <Badge variant="outline"><Users2 className="h-3 w-3 mr-1" />{overview.operators.length}</Badge>
              </div>
              <div className="h-64 overflow-auto pr-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Operador</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.operators.map((r) => (
                      <TableRow key={r.usuario}>
                        <TableCell className="font-medium">{r.usuario}</TableCell>
                        <TableCell className="text-right font-mono">{r.horas.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* WIP */}
        <TabsContent value="wip">
          <Card className="p-4 overflow-hidden">
            <div className="font-semibold mb-3">Órdenes en curso</div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Prioridad</TableHead>
                  <TableHead className="text-right">Producido</TableHead>
                  <TableHead className="text-right">Plan</TableHead>
                  <TableHead className="text-right">Avance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wipSorted.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">{o.codigo}</TableCell>
                    <TableCell>{o.clienteNombre ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center"><StatusBadge estado={o.estado} /></TableCell>
                    <TableCell className="text-center"><PriorityBadge prioridad={o.prioridad} /></TableCell>
                    <TableCell className="text-right font-mono">{o.piezasHechas}</TableCell>
                    <TableCell className="text-right font-mono">{o.piezasPlan}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className={`text-sm font-medium tabular-nums ${o.avancePct === 100 ? "text-green-600" : ""}`}>
                          {o.avancePct.toFixed(0)}%
                        </div>
                        <div className="w-24">
                          <ProgressBar value={o.piezasHechas} max={Math.max(1, o.piezasPlan)} variant={o.avancePct === 100 ? "success" : "default"} />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {wipSorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin OTs en curso</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* REGISTRO RÁPIDO */}
        <TabsContent value="registros">
          {!canWrite ? (
            <Card className="p-6">No tienes permisos para registrar producción.</Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Horas */}
              <Card className="p-4 space-y-3">
                <div className="font-semibold">Registrar horas</div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12">
                    <label className="text-xs font-medium block mb-1">OT</label>
                    <select
                      className="w-full h-9 border rounded-md px-2"
                      value={otHoras}
                      onChange={(e) => setOtHoras(e.target.value)}
                    >
                      {quicklog.ots.map((o) => (
                        <option key={o.id} value={o.id}>{o.codigo} {o.estado === "OPEN" ? "(Abierta)" : "(En proceso)"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium block mb-1">Horas</label>
                    <Input type="number" min={0.25} step="0.25" value={horas} onChange={(e)=>setHoras(Number(e.target.value))} />
                  </div>
                  <div className="col-span-8">
                    <label className="text-xs font-medium block mb-1">Máquina (opcional)</label>
                    <Input value={maquina} onChange={(e)=>setMaquina(e.target.value)} placeholder="Ej: Torno CNC #1" />
                  </div>
                  <div className="col-span-12">
                    <label className="text-xs font-medium block mb-1">Nota (opcional)</label>
                    <Input value={nota} onChange={(e)=>setNota(e.target.value)} placeholder="Operación realizada…" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={async ()=>{
                      if (!otHoras) return toast.error("Selecciona una OT");
                      const fd = new FormData();
                      fd.set("otId", otHoras);
                      fd.set("horas", String(horas));
                      if (maquina.trim()) fd.set("maquina", maquina.trim());
                      if (nota.trim()) fd.set("nota", nota.trim());
                      const p = actions.logProduction(fd);
                      await toast.promise(p, {
                        loading: "Guardando…",
                        success: (r)=> r.message || "Parte registrado",
                        error: (e)=> e?.message || "No se pudo registrar",
                      });
                      setHoras(1); setMaquina(""); setNota("");
                      refresh();
                    }}
                  >
                    Guardar
                  </Button>
                </div>
              </Card>

              {/* Piezas terminadas */}
              <Card className="p-4 space-y-3">
                <div className="font-semibold">Registrar piezas terminadas</div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12">
                    <label className="text-xs font-medium block mb-1">OT</label>
                    <select
                      className="w-full h-9 border rounded-md px-2"
                      value={otHoras}
                      onChange={(e) => { setOtHoras(e.target.value); setPiezaSel(""); }}
                    >
                      {quicklog.ots.map((o) => (
                        <option key={o.id} value={o.id}>{o.codigo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-9">
                    <label className="text-xs font-medium block mb-1">Pieza</label>
                    <select
                      className="w-full h-9 border rounded-md px-2"
                      value={piezaSel}
                      onChange={(e)=>setPiezaSel(e.target.value)}
                    >
                      <option value="">Seleccione…</option>
                      {piezasDeOTSel.map(p => (
                        <option key={p.id} value={p.id}>{p.titulo} (pend. {p.pend})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium block mb-1">Cantidad</label>
                    <Input type="number" min={1} value={qtyFin} onChange={(e)=>setQtyFin(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={async ()=>{
                      if (!piezaSel) return toast.error("Selecciona la pieza");
                      const fd = new FormData();
                      fd.set("otId", otHoras);
                      fd.set("items", JSON.stringify([{ piezaId: piezaSel, cantidad: Number(qtyFin) }]));
                      const p = actions.logFinishedPieces(fd);
                      await toast.promise(p, {
                        loading: "Registrando…",
                        success: (r)=> r.message || "Producción registrada",
                        error: (e)=> e?.message || "No se pudo registrar",
                      });
                      setQtyFin(1);
                      refresh();
                    }}
                  >
                    Registrar
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* RANKING */}
        <TabsContent value="ranking" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <div className="font-semibold mb-3">Top máquinas (horas)</div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Máquina</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.machines.map(m => (
                  <TableRow key={m.maquina}>
                    <TableCell className="font-medium">{m.maquina}</TableCell>
                    <TableCell className="text-right font-mono">{m.horas.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4">
            <div className="font-semibold mb-3">Top operadores (horas)</div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.operators.map(o => (
                  <TableRow key={o.usuario}>
                    <TableCell className="font-medium">{o.usuario}</TableCell>
                    <TableCell className="text-right font-mono">{o.horas.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted">{icon}</div>
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}
