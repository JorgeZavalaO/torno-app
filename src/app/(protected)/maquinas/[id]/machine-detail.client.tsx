"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import MaintenanceScheduleDialog from "@/components/machines/maintenance-schedule-dialog";
import MaintenanceEditDialog from "@/components/machines/maintenance-edit-dialog";
import { MachineTools } from "@/components/maquinas/machine-tools";
import { 
  ArrowLeft, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Wrench,
  Activity,
  Calendar,
  TrendingUp,
  Settings,
  Plus
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Detail = Awaited<ReturnType<typeof import("@/app/server/queries/machines").getMachineDetail>>;
type Actions = {
  scheduleMaintenance: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
  closeMaintenance: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
  upsertMachine: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
  updateMaintenance: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
};

export default function MachineDetailClient({ canWrite, detail, actions, statusOptions, eventOptions, maintenanceOptions }:{
  canWrite: boolean;
  detail: NonNullable<Detail>;
  actions: Actions;
  statusOptions?: { value: string; label: string; color?: string | null }[];
  eventOptions?: { value: string; label: string; color?: string | null }[];
  maintenanceOptions?: { value: string; label: string; descripcion?: string | null }[];
}) {
  const router = useRouter();
  const m = detail.maquina;

  const getStatusBadge = (estado: string) => {
    const m = statusOptions?.find(o=>o.value===estado);
    if (m) {
      const style = m.color ? { backgroundColor: `${m.color}22`, color: m.color } : undefined;
      return <Badge style={style}>{m.label}</Badge>;
    }
    switch (estado) {
      case "ACTIVA":
        return <Badge variant="default" className="bg-green-100 text-green-800">Activa</Badge>;
      case "MANTENIMIENTO":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Mantenimiento</Badge>;
      case "BAJA":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Baja</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getEventTypeBadge = (tipo: string) => {
    const m = eventOptions?.find(o=>o.value===tipo);
    if (m) {
      const style = m.color ? { backgroundColor: `${m.color}22`, color: m.color } : undefined;
      return <Badge style={style}>{m.label}</Badge>;
    }
    switch (tipo) {
      case "USO":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Uso</Badge>;
      case "PARO":
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">Paro</Badge>;
      case "AVERIA":
        return <Badge variant="destructive">Avería</Badge>;
      case "MANTENIMIENTO":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Mantenimiento</Badge>;
      case "DISPONIBLE":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Disponible</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        <Link href="/maquinas" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3 w-3" /> 
          Volver a Máquinas
        </Link>
      </div>

      {/* Header mejorado */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-200/50 dark:border-blue-800/50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {m.nombre}
              </h1>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                {m.codigo}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                {m.categoria ?? "Sin categoría"}
              </span>
              {m.ubicacion && (
                <span className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  {m.ubicacion}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusBadge(m.estado)}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas (30d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detail.kpis.horas30d.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Uso: {detail.kpis.usoPctAprox.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paradas por Fallas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {detail.kpis.paradasPorFallas30d}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Averías</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {detail.kpis.averias30d}
            </div>
            <p className="text-xs text-muted-foreground">
              Eventos críticos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próx. Mantenimiento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {detail.kpis.horasParaSigMant !== null 
                ? detail.kpis.horasParaSigMant > 24 
                  ? `${Math.round(detail.kpis.horasParaSigMant / 24)}d`
                  : `${detail.kpis.horasParaSigMant}h`
                : "—"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {detail.kpis.pendMant} pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Secundarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Mantenimiento</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${detail.kpis.costoMant30d.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendencia (30 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detail.serie30d as { day: string; horas: number }[]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).getDate().toString()}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [`${value}h`, 'Horas']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="horas" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <MachineTools 
          maquinaId={m.id} 
          mountedTools={detail.mountedTools} 
          availableTools={detail.availableTools} 
        />
      </div>

      {/* Programar mantenimiento */}
      {canWrite && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    ¿Necesita mantenimiento?
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Programa mantenimientos preventivos, correctivos o predictivos
                  </p>
                </div>
              </div>
                <MaintenanceScheduleDialog
                maquinaId={m.id}
                actions={{
                  scheduleMaintenance: async (fd: FormData) => {
                    const r = await actions.scheduleMaintenance(fd);
                    if (r.ok) startTransition(() => router.refresh());
                    return r;
                  },
                }}
                maintenanceOptions={maintenanceOptions}
                trigger={
                  <Button size="lg" className="h-12 bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Programar Mantenimiento
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de eventos mejorado */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Eventos Recientes
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-medium">Fecha y Hora</TableHead>
                <TableHead className="font-medium">Tipo</TableHead>
                <TableHead className="font-medium">OT</TableHead>
                <TableHead className="font-medium text-right">Duración</TableHead>
                <TableHead className="font-medium">Usuario</TableHead>
                <TableHead className="font-medium">Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.eventos.map(e=>(
                <TableRow key={e.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-mono">
                    {new Date(e.inicio).toLocaleDateString()} 
                    <span className="text-muted-foreground ml-2">
                      {new Date(e.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </TableCell>
                  <TableCell>{getEventTypeBadge(e.tipo)}</TableCell>
                  <TableCell className="font-mono text-blue-600 dark:text-blue-400">
                    {e.ot?.codigo ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-right font-medium">
                    {Number(e.horas || 0).toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.usuario?.displayName ?? e.usuario?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[250px]">
                    <div className="truncate" title={e.nota ?? ""}>
                      {e.nota ?? "—"}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {detail.eventos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Activity className="h-12 w-12 text-muted-foreground/30" />
                      <div>
                        <p className="font-medium">Sin eventos registrados</p>
                        <p className="text-sm">Los eventos de la máquina aparecerán aquí</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Agenda de mantenimiento mejorada */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-green-600" />
            Historial de Mantenimientos
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-medium">Tipo</TableHead>
                <TableHead className="font-medium">Estado</TableHead>
                <TableHead className="font-medium">Fecha Programada</TableHead>
                <TableHead className="font-medium">Fecha Real</TableHead>
                <TableHead className="font-medium text-right">Costo</TableHead>
                <TableHead className="font-medium">Observaciones</TableHead>
                <TableHead className="font-medium text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.mantenimientos.map(mm => (
                <TableRow key={mm.id} className="hover:bg-muted/20">
                  <TableCell>{getEventTypeBadge(mm.tipo)}</TableCell>
                  <TableCell>{getStatusBadge(mm.estado)}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {new Date(mm.fechaProg).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {mm.fechaReal ? new Date(mm.fechaReal).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-right text-green-600 dark:text-green-400 font-medium">
                    ${Number(mm.costo || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-sm max-w-[250px]">
                    <div className="truncate" title={mm.nota ?? ""}>
                      {mm.nota ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {canWrite && mm.estado === "PENDIENTE" && (
                      <div className="flex items-center justify-center gap-2">
                        <MaintenanceEditDialog
                          id={mm.id}
                          tipo={mm.tipo}
                          fechaProg={new Date(mm.fechaProg).toISOString()}
                          costo={mm.costo as unknown as number}
                          nota={mm.nota ?? undefined}
                          actions={{ 
                            updateMaintenance: async (fd: FormData) => {
                              const r = await actions.updateMaintenance(fd);
                              if (r.ok) startTransition(() => router.refresh());
                              return r;
                            }
                          }}
                          maintenanceOptions={maintenanceOptions}
                        />
                        <Button size="sm" variant="outline" onClick={async () => {
                          const fd = new FormData();
                          fd.set("id", mm.id);
                          const p = actions.closeMaintenance(fd);
                          await toast.promise(p, { loading: "Cerrando…", success: "Cerrado", error: "Error" });
                          startTransition(() => router.refresh());
                        }}>
                          <Calendar className="h-3 w-3 mr-1" />
                          Cerrar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {detail.mantenimientos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Wrench className="h-12 w-12 text-muted-foreground/30" />
                      <div>
                        <p className="font-medium">Sin mantenimientos programados</p>
                        <p className="text-sm">Los mantenimientos aparecerán aquí una vez programados</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
