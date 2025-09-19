"use client";

import { useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Hammer, 
  Wrench, 
  Play, 
  FilePlus2, 
  Edit3, 
  Package, 
  Clock, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  FileText,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { StatusBadge, EstadoOT } from "@/components/ot/status-badge";
import { PriorityBadge, Prioridad } from "@/components/ot/priority-badge";
import { AcabadoDisplay } from "@/components/ot/acabado-badge";
import EditHeaderDialog from "@/components/ot/edit-header-dialog";
import EmitMaterialsDialog from "@/components/ot/emit-materials-dialog";
import RequestSCDialog from "@/components/ot/request-sc-dialog";
import { toast } from "sonner";

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

export default function OTDetailClient(props: {
  canWrite: boolean;
  detail: NonNullable<Detail>;
  products: ProductsMini;
  clients: ClientsMini;
  actions: Actions;
  prioridadOptions?: { value: string; label: string }[];
  acabadoOptions?: { value: string; label: string }[];
  currency: string;
}) {
  const { canWrite, detail, products, clients, actions, prioridadOptions, acabadoOptions, currency } = props;
  const { ot, kpis } = detail;
  const router = useRouter();
  const [openEdit, setOpenEdit] = useState(false);
  const [openEmit, setOpenEmit] = useState(false);
  const [openSC, setOpenSC] = useState(false);
  const [showCostParams, setShowCostParams] = useState(false);

  // Refresh helper: ejecuta router.refresh() y repite tras un pequeño delay
  // para asegurar que la revalidación del servidor (revalidatePath) haya aplicado
  // y evitar que el cliente vea contenido stale a la primera petición.
  const refreshAndEnsure = async () => {
    startTransition(() => router.refresh());
    // Espera breve para que la revalidación del servidor pueda completarse
    await new Promise((res) => setTimeout(res, 350));
    startTransition(() => router.refresh());
  };

  const coveragePct = Math.round(kpis.progresoMateriales * 100);
  const piezasPct = Math.round(kpis.progresoPiezas * 100);

  const canStart = canWrite && (coveragePct >= 20) && (ot.estado === "OPEN" || ot.estado === "DRAFT");
  const showStartButton = ot.estado !== "IN_PROGRESS" && ot.estado !== "DONE" && ot.estado !== "CANCELLED";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        {/* Header mejorado */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <Hammer className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {ot.codigo}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300">Orden de Trabajo</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge estado={ot.estado as EstadoOT} />
                  <PriorityBadge prioridad={ot.prioridad as Prioridad} options={prioridadOptions} />
                  {ot.cliente && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ot.cliente.nombre}
                    </Badge>
                  )}
                  {ot.fechaLimite && (
                    <Badge variant="outline" className="border-amber-200 text-amber-700 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ot.fechaLimite).toLocaleDateString()}
                    </Badge>
                  )}
                </div>

                {ot.notas && (
                  <div className="flex items-start gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <FileText className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ot.notas}</p>
                  </div>
                )}

                {ot.acabado && (
                  <div className="flex items-center gap-2">
                    <AcabadoDisplay acabado={ot.acabado} options={acabadoOptions} />
                  </div>
                )}
              </div>

              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setOpenEdit(true)}
                    className="bg-white/80 hover:bg-white border-slate-200"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setOpenEmit(true)}
                    className="bg-white/80 hover:bg-white border-slate-200"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Emitir materiales
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setOpenSC(true)}
                    className="bg-white/80 hover:bg-white border-slate-200"
                  >
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    Solicitud compra
                  </Button>
                  {showStartButton && (
                    <Button 
                      onClick={async () => {
                        const p = actions.startOTManually({ otId: ot.id });
                        await toast.promise(p, { 
                          loading: "Iniciando OT...", 
                          success: (r) => r.message || "OT iniciada exitosamente", 
                          error: (e) => e?.message || "No se pudo iniciar la OT" 
                        });
                        await actions.recompute(ot.id);
                        await refreshAndEnsure();
                      }} 
                      disabled={!canStart}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar OT
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs mejorados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Progreso Materiales
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {coveragePct}%
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={coveragePct} className="h-2" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {kpis.matsPend > 0 ? `${kpis.matsPend} pendientes` : 'Completo'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Progreso Piezas
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {piezasPct}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <Edit3 className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={piezasPct} className="h-2" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {kpis.piezasPend > 0 ? `${kpis.piezasPend} pendientes` : 'Completo'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Estado General
                  </p>
                  <div className="flex items-center gap-2">
                    {(coveragePct >= 80 && piezasPct >= 80) ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-semibold text-green-600">En curso</span>
                      </>
                    ) : coveragePct < 20 || kpis.matsPend > 0 ? (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="text-lg font-semibold text-red-600">Bloqueado</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="text-lg font-semibold text-yellow-600">En espera</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Costo Total
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {ot.costTotal ? `${currency} ${ot.costTotal.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {ot.costTotal && ot.costQuoteTotal && ot.costQuoteTotal > 0 ? (
                  ot.costTotal > ot.costQuoteTotal ? (
                    <span className="text-red-600">
                      +{((ot.costTotal - ot.costQuoteTotal) / ot.costQuoteTotal * 100).toFixed(1)}% vs estimado
                    </span>
                  ) : (
                    <span className="text-green-600">
                      -{((ot.costQuoteTotal - ot.costTotal) / ot.costQuoteTotal * 100).toFixed(1)}% vs estimado
                    </span>
                  )
                ) : 'Calculando costos...'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Costos Detallados mejorados */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Análisis de Costos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Costos Calculados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-600">Materiales</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {ot.costMaterials ? `${currency} ${ot.costMaterials.toFixed(2)}` : '—'}
                </p>
                {ot.costQuoteMaterials && ot.costMaterials && (
                  <p className="text-xs text-slate-500">
                    Est: {currency} {ot.costQuoteMaterials.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-slate-600">Mano de obra</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {ot.costLabor ? `${currency} ${ot.costLabor.toFixed(2)}` : '—'}
                </p>
                {ot.costQuoteLabor && ot.costLabor && (
                  <p className="text-xs text-slate-500">
                    Est: {currency} {ot.costQuoteLabor.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-slate-600">Overheads</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {ot.costOverheads ? `${currency} ${ot.costOverheads.toFixed(2)}` : '—'}
                </p>
                {ot.costQuoteOverheads && ot.costOverheads && (
                  <p className="text-xs text-slate-500">
                    Est: {currency} {ot.costQuoteOverheads.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-slate-600">Total</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  {ot.costTotal ? `${currency} ${ot.costTotal.toFixed(2)}` : '—'}
                </p>
                {ot.costQuoteTotal && ot.costTotal && (
                  <p className="text-xs text-slate-500">
                    Est: {currency} {ot.costQuoteTotal.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Parámetros de Costeo */}
            {ot.costParams && Object.keys(ot.costParams).length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCostParams(!showCostParams)}
                    className="w-full justify-between p-4 h-auto hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Parámetros de costeo aplicados
                      </span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {Object.keys(ot.costParams).length} parámetros
                      </Badge>
                    </div>
                    {showCostParams ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                  
                  {showCostParams && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                      {Object.entries(ot.costParams as Record<string, unknown>).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{key}:</span>
                          <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Nota informativa */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Actualización automática de costos</p>
                  <p className="mt-1">
                    Los costos se recalculan automáticamente al emitir materiales, registrar producción o recibir compras vinculadas.
                    {ot.costTotal === 0 && " Los costos aparecerán una vez se registren movimientos o producción."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materiales mejorados */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-blue-600" />
              Materiales Planificados
              <Badge variant="secondary" className="ml-2">
                {matsPlan.length} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matsPlan.length > 0 ? (
              <div className="space-y-4">
                {matsPlan.map((r) => (
                  <div key={r.sku} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {r.nombre}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {r.sku}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Unidad: {r.uom || 'u'}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 min-w-0 sm:min-w-[300px]">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Planificado</p>
                          <p className="text-lg font-bold text-blue-600">{r.plan}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Emitido</p>
                          <p className="text-lg font-bold text-green-600">{r.emit}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Pendiente</p>
                          <p className={`text-lg font-bold ${r.pend > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {r.pend}
                          </p>
                        </div>
                      </div>
                    </div>

                    {r.plan > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                          <span>Progreso</span>
                          <span>{Math.round((r.emit / r.plan) * 100)}%</span>
                        </div>
                        <Progress value={(r.emit / r.plan) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Sin materiales planificados</p>
                <p className="text-sm text-slate-400">Los materiales aparecerán aquí una vez sean agregados al plan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Piezas mejoradas */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Edit3 className="h-5 w-5 text-green-600" />
              Piezas en Producción
              <Badge variant="secondary" className="ml-2">
                {piezasRows.length} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {piezasRows.length > 0 ? (
              <div className="space-y-4">
                {piezasRows.map((p) => (
                  <div key={p.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {p.desc}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 min-w-0 sm:min-w-[300px]">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Planificado</p>
                          <p className="text-lg font-bold text-blue-600">{p.plan}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Completado</p>
                          <p className="text-lg font-bold text-green-600">{p.hecha}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Pendiente</p>
                          <p className={`text-lg font-bold ${p.pend > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {p.pend}
                          </p>
                        </div>
                      </div>
                    </div>

                    {p.plan > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                          <span>Progreso</span>
                          <span>{Math.round((p.hecha / p.plan) * 100)}%</span>
                        </div>
                        <Progress value={(p.hecha / p.plan) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Edit3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Sin piezas registradas</p>
                <p className="text-sm text-slate-400">Las piezas aparecerán aquí una vez sean agregadas al plan</p>
              </div>
            )}

            <Separator className="my-6" />
            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Registro de producción</p>
                  <p className="mt-1">
                    Esta sección es informativa. El registro de producción y horas se realiza en el módulo de{' '}
                    <strong>Control de Producción</strong>.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partes de producción mejoradas */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-purple-600" />
              Historial de Producción
              <Badge variant="secondary" className="ml-2">
                {ot.partesProduccion.length} registros
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ot.partesProduccion.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {ot.partesProduccion.map((pp) => (
                  <div key={pp.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {new Date(pp.fecha).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {pp.usuario?.displayName ?? pp.usuario?.email ?? "Usuario desconocido"}
                          </span>
                        </div>
                        {pp.maquina && (
                          <div className="flex items-center gap-2 text-sm">
                            <Edit3 className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600 dark:text-slate-400">
                              Máquina: {pp.maquina}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 min-w-0 lg:min-w-[200px]">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Horas</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Number(pp.horas || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Pieza</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                            {pp.pieza?.descripcion ?? pp.pieza?.productoId ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {pp.nota && (
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-600 dark:text-slate-300">{pp.nota}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Sin registros de producción</p>
                <p className="text-sm text-slate-400">
                  Los registros de producción aparecerán aquí una vez se registren horas y avances
                </p>
              </div>
            )}
          </CardContent>
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
              prioridadOptions={prioridadOptions}
              acabadoOptions={acabadoOptions}
              onSave={async (payload: Parameters<Actions["updateOTHeader"]>[0]) => {
                const p = actions.updateOTHeader(payload);
                await toast.promise(p, { 
                  loading: "Guardando cambios...", 
                  success: (r) => r.message || "Orden actualizada exitosamente", 
                  error: "Error al actualizar la orden" 
                });
                await actions.recompute(ot.id);
                await refreshAndEnsure();
              }}
            />
            <EmitMaterialsDialog
              open={openEmit}
              onOpenChange={setOpenEmit}
              materials={matsPlan}
              products={products}
              onEmit={async (items: { sku: string; qty: number }[]) => {
                const p = actions.emitOTMaterials({ otId: ot.id, items });
                await toast.promise(p, { 
                  loading: "Emitiendo materiales...", 
                  success: (r) => r.message || "Materiales emitidos exitosamente", 
                  error: "Error al emitir materiales" 
                });
                await actions.recompute(ot.id);
                await refreshAndEnsure();
              }}
            />
            <RequestSCDialog
              open={openSC}
              onOpenChange={setOpenSC}
              onConfirm={async (nota?: string) => {
                const p = actions.createManualSCForOT({ otId: ot.id, nota });
                await toast.promise(p, { 
                  loading: "Creando solicitud de compra...", 
                  success: (r) => r.message || "Solicitud de compra creada exitosamente", 
                  error: "Error al crear la solicitud" 
                });
                await refreshAndEnsure();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}