"use client";

import { useMemo, useState, startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Package, 
  User, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Info,
  X
} from "lucide-react";
import type { QuickLog, Actions } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

type Line = { piezaId: string; titulo: string; cantidad: number; pend?: number };

export function UnifiedRegistration({
  quicklog,
  actions,
  canWrite,
}: {
  quicklog: QuickLog;
  actions: Actions;
  canWrite: boolean;
}) {
  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  const inProgressOTs = quicklog.ots.filter(o => o.estado === "IN_PROGRESS");
  const [otId, setOtId] = useState<string>(inProgressOTs[0]?.id ?? "");
  const selectedOT = quicklog.ots.find(o => o.id === otId);

  // Estados para UI
  const [activeStep, setActiveStep] = useState<'work' | 'pieces'>('work');
  const [showSecondMachine, setShowSecondMachine] = useState(false);

  // Horas / máquinas
  const [horas, setHoras] = useState<number>(1);
  const [operadorId, setOperadorId] = useState<string>("");
  const [maquinaSel, setMaquinaSel] = useState<string>("");
  const [maquinaLibre, setMaquinaLibre] = useState<string>("");

  // Segunda máquina
  const [horas2, setHoras2] = useState<number>(0);
  const [maquina2Sel, setMaquina2Sel] = useState<string>("");
  const [maquina2Libre, setMaquina2Libre] = useState<string>("");

  // Piezas
  const piezas = useMemo(() => selectedOT?.piezas ?? [], [selectedOT]);
  const [piezaSel, setPiezaSel] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [lines, setLines] = useState<Line[]>([]);

  const [nota, setNota] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persistir preferencias
  useEffect(() => {
    const op = localStorage.getItem("prod.operadorId") || "";
    const mq = localStorage.getItem("prod.maquinaSel") || "";
    if (op) setOperadorId(op);
    if (mq) setMaquinaSel(mq);
  }, []);
  useEffect(() => { if (operadorId) localStorage.setItem("prod.operadorId", operadorId); }, [operadorId]);
  useEffect(() => { if (maquinaSel) localStorage.setItem("prod.maquinaSel", maquinaSel); }, [maquinaSel]);

  const piezasDisponibles = useMemo(() => piezas.filter(p => (p.pend ?? 0) > 0), [piezas]);
  const totalHoras = useMemo(() => {
    const h1 = Number.isFinite(horas) && horas > 0 ? Number(horas) : 0;
    const h2 = showSecondMachine && Number.isFinite(horas2) && horas2 > 0 ? Number(horas2) : 0;
    return Number((h1 + h2).toFixed(2));
  }, [horas, horas2, showSecondMachine]);
  const totalPiezas = useMemo(() => lines.reduce((a, l) => a + (Number(l.cantidad) || 0), 0), [lines]);

  // Validaciones mejoradas
  const validationState = useMemo(() => {
    const errors: { field: string; message: string }[] = [];
    const warnings: string[] = [];

    if (!otId) errors.push({ field: 'ot', message: 'Selecciona una orden de trabajo' });
    
    const hasValidHours = (Number.isFinite(horas) && horas > 0) || 
                         (showSecondMachine && Number.isFinite(horas2) && horas2 > 0);
    const hasPieces = lines.length > 0;
    
    if (!hasValidHours && !hasPieces) {
      errors.push({ field: 'general', message: 'Registra horas, piezas, o ambos' });
    }

    if (horas !== undefined && horas <= 0) {
      errors.push({ field: 'horas', message: 'Las horas deben ser positivas' });
    }
    if (showSecondMachine && horas2 !== undefined && horas2 <= 0) {
      errors.push({ field: 'horas2', message: 'Las horas de la segunda máquina deben ser positivas' });
    }

    if (!operadorId) warnings.push('Considera asignar un operador');
    if (hasValidHours && !maquinaSel && !maquinaLibre) {
      warnings.push('Considera especificar la máquina utilizada');
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }, [otId, horas, horas2, showSecondMachine, lines.length, operadorId, maquinaSel, maquinaLibre]);

  const addLine = () => {
    if (!piezaSel) return toast.error("Selecciona una pieza");
    if (!qty || qty <= 0) return toast.error("Cantidad inválida");
    const p = piezas.find(x => x.id === piezaSel);
    if (!p) return;

    const yaAgregado = lines.find(l => l.piezaId === piezaSel)?.cantidad || 0;
    const pend = p.pend ?? Infinity;
    const disponible = Math.max(0, pend - yaAgregado);
    if (qty > disponible && Number.isFinite(disponible)) {
      return toast.error(`No puedes registrar más de lo pendiente (${disponible})`);
    }

    setLines(prev => {
      const idx = prev.findIndex(l => l.piezaId === piezaSel);
      if (idx >= 0) {
        const merged = [...prev];
        merged[idx] = { ...merged[idx], cantidad: merged[idx].cantidad + qty };
        return merged;
      }
      return [...prev, { piezaId: p.id, titulo: p.titulo, cantidad: qty, pend: p.pend }];
    });
    setQty(1);
    setPiezaSel("");
    toast.success(`${qty} ${p.titulo} agregado al carrito`);
  };

  const removeLine = (piezaId: string) => {
    const line = lines.find(l => l.piezaId === piezaId);
    setLines(prev => prev.filter(l => l.piezaId !== piezaId));
    if (line) {
      toast.success(`${line.titulo} eliminado del carrito`);
    }
  };

  const clearAll = () => {
    setHoras(1);
    setOperadorId("");
    setMaquinaSel(""); setMaquinaLibre("");
    setShowSecondMachine(false); setHoras2(0); setMaquina2Sel(""); setMaquina2Libre("");
    setNota("");
    setLines([]); setQty(1); setPiezaSel("");
    toast.success("Formulario limpiado");
  };

  const resolveMachineName = (sel: string, libre: string) => {
    if (sel && sel !== "__custom__") {
      const m = quicklog.maquinas.find(x => x.id === sel);
      return m?.nombre ?? "";
    }
    if (sel === "__custom__") return libre.trim();
    return "";
  };
  
  const resolveMachineId = (sel: string) => {
    if (sel && sel !== "__custom__") return sel;
    return "";
  };

  const handleSubmit = async () => {
    if (!canWrite) return;
    if (!validationState.isValid) {
      toast.error(validationState.errors[0]?.message || "Corrige los errores antes de continuar");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("otId", otId);

      const m1 = resolveMachineName(maquinaSel, maquinaLibre);
      const m2 = resolveMachineName(maquina2Sel, maquina2Libre);
      const maquinas: { id?: string; nombre: string; horas: number }[] = [];

      const h1 = Number(horas);
      if (Number.isFinite(h1) && h1 > 0) {
        const id1 = resolveMachineId(maquinaSel);
        maquinas.push({ id: id1 || undefined, nombre: m1 || "", horas: h1 });
      }

      if (showSecondMachine) {
        const h2 = Number(horas2);
        if (Number.isFinite(h2) && h2 > 0) {
          const id2 = resolveMachineId(maquina2Sel);
          maquinas.push({ id: id2 || undefined, nombre: m2 || "", horas: h2 });
        }
      }

      if (maquinas.length > 1) {
        fd.set("maquinas", JSON.stringify(maquinas));
      } else if (maquinas.length === 1) {
        fd.set("horas", String(maquinas[0].horas));
        if (maquinas[0].nombre) fd.set("maquina", maquinas[0].nombre);
        if (maquinas[0].id) fd.set("maquinaId", maquinas[0].id);
      }

      if (operadorId?.trim()) fd.set("userId", operadorId.trim());
      if (nota?.trim()) fd.set("nota", nota.trim());

      if (lines.length > 0) {
        fd.set("items", JSON.stringify(lines.map(l => ({
          piezaId: l.piezaId,
          cantidad: Number(l.cantidad),
        }))));
      }

      const r = await actions.logWorkAndPieces(fd);
      if (r.ok) {
        toast.success(r.message || "Registro guardado exitosamente");
        clearAll();
        refresh();
      } else {
        toast.error(r.message || "Error al guardar el registro");
      }
    } catch (e) {
      console.error("Error en handleSubmit:", e);
      toast.error("Error inesperado al procesar el registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completionPercentage = useMemo(() => {
    if (!selectedOT) return 0;
    const piezas = selectedOT.piezas || [];
    // Solo calculamos si tenemos cantidades planificadas válidas
    const planTotal = piezas.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);
    if (planTotal <= 0) return 0;
    const hechoTotal = piezas.reduce((s, p) => {
      const plan = Number(p.cantidad) || 0;
      const pend = Number(p.pend) || 0;
      const hecho = Math.max(0, plan - pend);
      return s + hecho;
    }, 0);
    const pct = (hechoTotal / planTotal) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }, [selectedOT]);

  if (!canWrite) {
    return (
      <Card className="p-8 text-center border-amber-200 bg-amber-50">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-800">Sin permisos de escritura</h3>
            <p className="text-amber-600 mt-1">No tienes autorización para registrar producción.</p>
          </div>
        </div>
      </Card>
    );
  }

  if (quicklog.ots.length === 0) {
    return (
      <Card className="p-8 text-center border-blue-200 bg-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Info className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-800">Sin órdenes activas</h3>
            <p className="text-blue-600 mt-1">No hay órdenes de trabajo abiertas o en proceso.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6 shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      {/* Header mejorado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Registro de Producción</h3>
            <p className="text-sm text-gray-600">Registra horas y piezas de manera integrada</p>
          </div>
        </div>
        
        {selectedOT && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-medium">
                {selectedOT.piezas.length} tipos de piezas
              </Badge>
              <Badge variant="secondary" className="font-medium">
                {selectedOT.piezas.reduce((a,p)=>a+(p.pend||0),0)} pendientes
              </Badge>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-500">Progreso general</span>
              <div className="flex items-center gap-2 min-w-[100px]">
                <Progress value={completionPercentage} className="h-2" />
                <span className="text-xs font-medium">{completionPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alertas de validación */}
      {validationState.errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {validationState.errors[0].message}
          </AlertDescription>
        </Alert>
      )}

      {validationState.warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {validationState.warnings.join(". ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Selección OT mejorada */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span>Orden de Trabajo</span>
          <span className="text-red-500">*</span>
        </label>
        <Select 
          value={otId} 
          onValueChange={(value) => { 
            setOtId(value); 
            setLines([]); 
            setPiezaSel(""); 
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger className={`w-full h-11 ${!otId ? 'border-red-300' : 'border-gray-300'}`}>
            <SelectValue placeholder="Selecciona una orden de trabajo..." />
          </SelectTrigger>
          <SelectContent>
            {inProgressOTs.map(ot => (
              <SelectItem key={ot.id} value={ot.id} className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{ot.codigo}</span>
                  <span className="text-xs text-gray-500">En proceso</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pestañas para organizar contenido */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveStep('work')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeStep === 'work'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="inline h-4 w-4 mr-2" />
            Trabajo
          </button>
          <button
            onClick={() => setActiveStep('pieces')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeStep === 'pieces'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="inline h-4 w-4 mr-2" />
            Piezas {lines.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{lines.length}</Badge>
            )}
          </button>
        </nav>
      </div>

      {/* Contenido de pestañas */}
      {activeStep === 'work' && (
        <div className="space-y-6">
          {/* Grid principal mejorado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horas trabajadas
              </label>
              <Input
                type="number"
                min={0.25}
                step="0.25"
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                placeholder="1.5"
                disabled={isSubmitting}
                className={`h-11 ${validationState.errors.some(e => e.field === 'horas') ? 'border-red-300' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Operador
              </label>
              <Select value={operadorId} onValueChange={setOperadorId} disabled={isSubmitting}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar operador" />
                </SelectTrigger>
                <SelectContent>
                  {quicklog.operadores.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nombre}{op.email ? ` — ${op.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Máquina
              </label>
              <Select
                value={maquinaSel}
                onValueChange={(v) => { 
                  setMaquinaSel(v); 
                  if (v !== "__custom__") setMaquinaLibre(""); 
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona una máquina" />
                </SelectTrigger>
                <SelectContent>
                  {quicklog.maquinas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">📝 Otra (escribir nombre)</SelectItem>
                </SelectContent>
              </Select>
              {maquinaSel === "__custom__" && (
                <Input
                  className="mt-2 h-11"
                  value={maquinaLibre}
                  onChange={(e) => setMaquinaLibre(e.target.value)}
                  placeholder="Ej: Torno CNC #1"
                  disabled={isSubmitting}
                />
              )}
            </div>
          </div>

          {/* Segunda máquina mejorada */}
          <Card className="p-4 bg-gray-50 border-dashed border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">Segunda Máquina</span>
                <Badge variant="outline" className="text-xs">Opcional</Badge>
              </div>
              <Button 
                type="button" 
                variant={showSecondMachine ? "secondary" : "outline"} 
                size="sm" 
                onClick={() => setShowSecondMachine(v => !v)}
                disabled={isSubmitting}
              >
                {showSecondMachine ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {showSecondMachine ? "Quitar" : "Agregar"}
              </Button>
            </div>

            {showSecondMachine && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Horas (máquina 2)</label>
                  <Input
                    type="number"
                    min={0.25}
                    step="0.25"
                    value={horas2}
                    onChange={(e) => setHoras2(Number(e.target.value))}
                    placeholder="0.5"
                    disabled={isSubmitting}
                    className={`h-11 ${validationState.errors.some(e => e.field === 'horas2') ? 'border-red-300' : ''}`}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-gray-600">Máquina 2</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={maquina2Sel}
                      onValueChange={(v) => { 
                        setMaquina2Sel(v); 
                        if (v !== "__custom__") setMaquina2Libre(""); 
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecciona máquina" />
                      </SelectTrigger>
                      <SelectContent>
                        {quicklog.maquinas.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                        ))}
                        <SelectItem value="__custom__">Otra (escribir)</SelectItem>
                      </SelectContent>
                    </Select>
                    {maquina2Sel === "__custom__" && (
                      <Input
                        value={maquina2Libre}
                        onChange={(e) => setMaquina2Libre(e.target.value)}
                        placeholder="Ej: Cepillo #2"
                        disabled={isSubmitting}
                        className="h-11"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Nota mejorada */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Descripción del trabajo</label>
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Operación realizada, materiales usados, observaciones..."
              disabled={isSubmitting}
              className="h-11"
            />
            <p className="text-xs text-gray-500">Información adicional sobre el trabajo realizado (opcional)</p>
          </div>
        </div>
      )}

      {activeStep === 'pieces' && (
        <div className="space-y-6">
          {/* Selector de piezas mejorado */}
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Pieza a registrar
                </label>
                <Select
                  value={piezaSel}
                  onValueChange={setPiezaSel}
                  disabled={isSubmitting || piezasDisponibles.length === 0}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Seleccione una pieza..." />
                  </SelectTrigger>
                  <SelectContent>
                    {piezasDisponibles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{p.titulo}</span>
                          <span className="text-xs text-gray-500">Pendiente: {p.pend}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Cantidad</label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
              
              <Button 
                type="button" 
                onClick={addLine} 
                disabled={isSubmitting || !piezaSel || qty <= 0}
                className="h-11 bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" /> 
                Agregar
              </Button>
            </div>
          </Card>

          {/* Tabla de piezas mejorada */}
          <Card className="overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Carrito de Piezas
                </h4>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="font-medium">
                    {lines.length} tipos
                  </Badge>
                  <Badge variant="outline" className="font-medium">
                    {totalPiezas} unidades
                  </Badge>
                </div>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Pieza</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Package className="h-8 w-8 opacity-50" />
                        <span>No hay piezas en el carrito</span>
                        <span className="text-xs">Agrega piezas usando el formulario superior</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map(l => (
                    <TableRow key={l.piezaId} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{l.titulo}</TableCell>
                      <TableCell className="text-right font-mono text-green-600 font-semibold">
                        {l.cantidad}
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-500">
                        {l.pend ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeLine(l.piezaId)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Resumen general mejorado */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-none">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Total horas:</span>
              <Badge variant="secondary" className="font-bold text-blue-700 bg-blue-100">
                {totalHoras}h
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Piezas:</span>
              <Badge variant="secondary" className="font-bold text-green-700 bg-green-100">
                {totalPiezas}
              </Badge>
            </div>
          </div>
          
          {!validationState.isValid && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Revisa los errores antes de continuar</span>
            </div>
          )}
        </div>
      </Card>

      <Separator className="my-6" />

      {/* Acciones mejoradas */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={clearAll} 
            disabled={isSubmitting}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpiar formulario
          </Button>
          
          {validationState.isValid && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Listo para registrar</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!validationState.isValid || isSubmitting || !otId}
          className={`min-w-[200px] h-11 font-semibold shadow-lg transition-all ${
            validationState.isValid 
              ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Procesando registro...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Registrar Producción
            </>
          )}
        </Button>
      </div>

      {/* Información adicional */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
        💡 Tip: Puedes registrar solo horas, solo piezas, o ambos en un mismo envío
      </div>
    </Card>
  );
}
