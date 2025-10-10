"use client";

import { useMemo, useState, startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Package, 
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react";
import type { QuickLog, Actions } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Line = { piezaId: string; titulo: string; cantidad: number; pend?: number };

// Hook personalizado para manejar preferencias de localStorage
const usePersistedState = (key: string, initialValue: string) => {
  const [value, setValue] = useState<string>(initialValue);
  
  useEffect(() => {
    const stored = localStorage.getItem(key) || initialValue;
    setValue(stored);
  }, [key, initialValue]);
  
  useEffect(() => {
    if (value) localStorage.setItem(key, value);
  }, [key, value]);
  
  return [value, setValue] as const;
};

// Hook personalizado para validaciones simplificado
const useValidation = (
  otId: string, 
  horas: number, 
  horas2: number, 
  showSecondMachine: boolean, 
  lines: Line[],
  operadorId: string,
  maquinaSel: string,
  maquinaLibre: string,
  operador2Id: string,
  maquina2Sel: string,
  maquina2Libre: string
) => {
  return useMemo(() => {
    const errors: { field: string; message: string }[] = [];

    if (!otId) errors.push({ field: 'ot', message: 'Selecciona una orden de trabajo' });
    
    const hasValidHours = (Number.isFinite(horas) && horas > 0) || 
                         (showSecondMachine && Number.isFinite(horas2) && horas2 > 0);
    const hasPieces = lines.length > 0;
    
    // Requiere AMBAS: horas completas Y piezas
    if (!hasValidHours || !hasPieces) {
      errors.push({ field: 'general', message: 'Completa tanto las horas de trabajo como las piezas antes de guardar' });
    }

    // Validaciones adicionales para campos obligatorios cuando hay horas
    if (hasValidHours) {
      if (Number.isFinite(horas) && horas > 0) {
        if (!operadorId) errors.push({ field: 'operador', message: 'Selecciona un operador para las horas trabajadas' });
        if (!maquinaSel) errors.push({ field: 'maquina', message: 'Selecciona una máquina para las horas trabajadas' });
        if (maquinaSel === "__custom__" && !maquinaLibre.trim()) {
          errors.push({ field: 'maquinaLibre', message: 'Ingresa el nombre de la máquina personalizada' });
        }
      }
      if (showSecondMachine && Number.isFinite(horas2) && horas2 > 0) {
        if (!operador2Id) errors.push({ field: 'operador2', message: 'Selecciona un operador para la segunda máquina' });
        if (!maquina2Sel) errors.push({ field: 'maquina2', message: 'Selecciona una máquina para la segunda máquina' });
        if (maquina2Sel === "__custom__" && !maquina2Libre.trim()) {
          errors.push({ field: 'maquina2Libre', message: 'Ingresa el nombre de la segunda máquina personalizada' });
        }
      }
    }

    return { errors, isValid: errors.length === 0 };
  }, [otId, horas, horas2, showSecondMachine, lines.length, operadorId, maquinaSel, maquinaLibre, operador2Id, maquina2Sel, maquina2Libre]);
};

interface RegistrationDialogContentProps {
  quicklog: QuickLog;
  actions: Actions;
  canWrite: boolean;
  onSuccess?: () => void;
}

export function RegistrationDialogContent({
  quicklog,
  actions,
  canWrite,
  onSuccess
}: RegistrationDialogContentProps) {
  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  const inProgressOTs = quicklog.ots.filter(o => o.estado === "IN_PROGRESS");
  const [otId, setOtId] = useState<string>("");
  const selectedOT = quicklog.ots.find(o => o.id === otId);

  // Estados para UI - Simplificados
  const [activeStep, setActiveStep] = useState<'work' | 'pieces'>('work');
  const [showSecondMachine, setShowSecondMachine] = useState(false);

  // Estados principales
  const [horas, setHoras] = useState<number>(0);
  const [operadorId, setOperadorId] = usePersistedState("prod.operadorId", "");
  const [maquinaSel, setMaquinaSel] = usePersistedState("prod.maquinaSel", "");
  const [maquinaLibre, setMaquinaLibre] = useState<string>("");

  // Segunda máquina
  const [horas2, setHoras2] = useState<number>(0);
  const [operador2Id, setOperador2Id] = usePersistedState("prod.operador2Id", "");
  const [maquina2Sel, setMaquina2Sel] = useState<string>("");
  const [maquina2Libre, setMaquina2Libre] = useState<string>("");

  // Piezas
  const piezas = useMemo(() => selectedOT?.piezas ?? [], [selectedOT]);
  const [piezaSel, setPiezaSel] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [lines, setLines] = useState<Line[]>([]);

  const [nota, setNota] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cálculos derivados
  const piezasDisponibles = useMemo(() => piezas.filter(p => (p.pend ?? 0) > 0), [piezas]);
  const totalHoras = useMemo(() => {
    const h1 = Number.isFinite(horas) && horas > 0 ? Number(horas) : 0;
    const h2 = showSecondMachine && Number.isFinite(horas2) && horas2 > 0 ? Number(horas2) : 0;
    return Number((h1 + h2).toFixed(2));
  }, [horas, horas2, showSecondMachine]);
  const totalPiezas = useMemo(() => lines.reduce((a, l) => a + (Number(l.cantidad) || 0), 0), [lines]);

  // Estados de completitud para UX
  const workComplete = useMemo(() => {
    const hasValidHours = (Number.isFinite(horas) && horas > 0) || 
                         (showSecondMachine && Number.isFinite(horas2) && horas2 > 0);
    if (!hasValidHours) return false;
    
    if (Number.isFinite(horas) && horas > 0) {
      if (!operadorId || !maquinaSel) return false;
      if (maquinaSel === "__custom__" && !maquinaLibre.trim()) return false;
    }
    
    if (showSecondMachine && Number.isFinite(horas2) && horas2 > 0) {
      if (!operador2Id || !maquina2Sel) return false;
      if (maquina2Sel === "__custom__" && !maquina2Libre.trim()) return false;
    }
    
    return true;
  }, [horas, horas2, showSecondMachine, operadorId, maquinaSel, maquinaLibre, operador2Id, maquina2Sel, maquina2Libre]);

  const piecesComplete = lines.length > 0;

  // Validación usando hook personalizado
  const validationState = useValidation(otId, horas, horas2, showSecondMachine, lines, operadorId, maquinaSel, maquinaLibre, operador2Id, maquina2Sel, maquina2Libre);

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
    toast.success(`${qty} ${p.titulo} agregado`);
  };

  const removeLine = (piezaId: string) => {
    setLines(prev => prev.filter(l => l.piezaId !== piezaId));
  };

  const clearAll = () => {
    setHoras(0);
    setOperadorId("");
    setOperador2Id("");
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
      toast.error(validationState.errors[0]?.message || "Completa todos los campos obligatorios antes de guardar");
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
      if (Number.isFinite(h1) && h1 > 0 && operadorId && maquinaSel) {
        const id1 = resolveMachineId(maquinaSel);
        const entry1 = { id: id1 || undefined, nombre: m1 || "", horas: h1 } as Record<string, unknown>;
        if (operadorId?.trim()) (entry1 as Record<string, string>)['userId'] = operadorId.trim();
        maquinas.push(entry1 as { id?: string; nombre: string; horas: number });
      }

      if (showSecondMachine) {
        const h2 = Number(horas2);
        if (Number.isFinite(h2) && h2 > 0 && operador2Id && maquina2Sel) {
          const id2 = resolveMachineId(maquina2Sel);
          const entry2 = { id: id2 || undefined, nombre: m2 || "", horas: h2 } as Record<string, unknown>;
          if (operador2Id?.trim()) (entry2 as Record<string, string>)['userId'] = operador2Id.trim();
          maquinas.push(entry2 as { id?: string; nombre: string; horas: number });
        }
      }

      if (maquinas.length > 1) {
        fd.set("maquinas", JSON.stringify(maquinas));
      } else if (maquinas.length === 1) {
        fd.set("horas", String(maquinas[0].horas));
        if (maquinas[0].nombre) fd.set("maquina", maquinas[0].nombre);
        if (maquinas[0].id) fd.set("maquinaId", maquinas[0].id);
      }

      if (maquinas.length === 0 && lines.length === 0) {
        toast.error("Completa tanto las horas de trabajo como las piezas antes de guardar");
        setIsSubmitting(false);
        return;
      }

      if (operadorId?.trim()) fd.set("userId", operadorId.trim());
      if (operador2Id?.trim()) fd.set("userId2", operador2Id.trim());
      if (nota?.trim()) fd.set("nota", nota.trim());

      if (lines.length > 0) {
        fd.set("items", JSON.stringify(lines.map(l => ({
          piezaId: l.piezaId,
          cantidad: Number(l.cantidad),
        }))));
      }

      const r = await actions.logWorkAndPieces(fd);
      if (r.ok) {
        toast.success("Registro guardado exitosamente");
        clearAll();
        refresh();
        onSuccess?.();
      } else {
        toast.error(r.message || "Error al guardar el registro");
      }
    } catch (e) {
      console.error("Error en handleSubmit:", e);
      toast.error("Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canWrite) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 border border-gray-200 rounded-lg">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin permisos de escritura</h3>
        <p className="text-gray-600 max-w-md">
          No tienes autorización para registrar producción en este módulo. 
          Contacta a tu administrador si necesitas acceso.
        </p>
      </div>
    );
  }

  if (quicklog.ots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-16 w-16 text-blue-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay órdenes activas</h3>
        <p className="text-gray-600 max-w-md">
          Actualmente no hay órdenes de trabajo en proceso o abiertas. 
          Crea una nueva orden de trabajo para comenzar a registrar producción.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header con OT mejorado */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Orden de Trabajo <span className="text-red-500">*</span>
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
          <SelectTrigger className="w-full h-12 text-left">
            <SelectValue placeholder="Selecciona la orden de trabajo donde registrarás la producción..." />
          </SelectTrigger>
          <SelectContent>
            {inProgressOTs.map(ot => (
              <SelectItem key={ot.id} value={ot.id} className="py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{ot.codigo}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      En proceso
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {ot.piezas?.length || 0} piezas pendientes
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-2">
          Selecciona la OT donde se realizó el trabajo de producción
        </p>
      </div>

      {/* Alertas mejoradas */}
      {validationState.errors.length > 0 && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                Información requerida
              </h4>
              <p className="text-sm text-amber-700">
                {validationState.errors[0].message}
              </p>
              <div className="mt-2 flex gap-4 text-xs text-amber-600">
                <span className={`flex items-center gap-1 ${workComplete ? 'text-green-600' : ''}`}>
                  {workComplete ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  Trabajo
                </span>
                <span className={`flex items-center gap-1 ${piecesComplete ? 'text-green-600' : ''}`}>
                  {piecesComplete ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  Piezas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navegación mejorada con indicadores de estado */}
      <div className="flex bg-gray-50 rounded-lg p-1 border">
        <button
          onClick={() => setActiveStep('work')}
          className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeStep === 'work'
              ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Trabajo</span>
          {workComplete && (
            <Check className="h-4 w-4 text-green-600" />
          )}
          {!workComplete && activeStep === 'work' && (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
        </button>
        <button
          onClick={() => setActiveStep('pieces')}
          className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeStep === 'pieces'
              ? 'bg-white text-green-600 shadow-sm border border-green-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Piezas</span>
          {piecesComplete && (
            <Check className="h-4 w-4 text-green-600" />
          )}
          {!piecesComplete && activeStep === 'pieces' && (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          {lines.length > 0 && (
            <span className="ml-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {lines.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido dinámico */}
      {activeStep === 'work' && (
        <div className="space-y-6">
          {/* Estado de completitud */}
          {workComplete && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Información de trabajo completa</span>
              </div>
            </div>
          )}

          {/* Formulario de trabajo mejorado */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Registro de Trabajo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Horas */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Horas trabajadas <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.25"
                  value={horas || ''}
                  onChange={(e) => setHoras(Number(e.target.value) || 0)}
                  placeholder="Ej: 2.5"
                  className={`h-11 ${horas > 0 ? 'border-green-300 focus:border-green-500' : ''}`}
                />
                <p className="text-xs text-gray-500">Tiempo efectivo de trabajo en horas</p>
              </div>

              {/* Operador */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Operador <span className="text-red-500">*</span>
                </label>
                <Select value={operadorId} onValueChange={setOperadorId}>
                  <SelectTrigger className={`h-11 ${operadorId ? 'border-green-300' : ''}`}>
                    <SelectValue placeholder="Seleccionar operador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {quicklog.operadores.map(op => (
                      <SelectItem key={op.id} value={op.id} className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {op.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Persona que realizó el trabajo</p>
              </div>

              {/* Máquina */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Máquina <span className="text-red-500">*</span>
                </label>
                <Select
                  value={maquinaSel}
                  onValueChange={(v) => { 
                    setMaquinaSel(v); 
                    if (v !== "__custom__") setMaquinaLibre(""); 
                  }}
                >
                  <SelectTrigger className={`h-11 ${maquinaSel ? 'border-green-300' : ''}`}>
                    <SelectValue placeholder="Seleccionar máquina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {quicklog.maquinas.map(m => (
                      <SelectItem key={m.id} value={m.id} className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {m.nombre}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="py-2">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Otra máquina
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {maquinaSel === "__custom__" && (
                  <Input
                    value={maquinaLibre}
                    onChange={(e) => setMaquinaLibre(e.target.value)}
                    placeholder="Nombre de la máquina"
                    className="h-11 mt-2"
                  />
                )}
                <p className="text-xs text-gray-500">Equipo utilizado en el trabajo</p>
              </div>
            </div>
          </div>

          {/* Segunda máquina mejorada */}
          {!showSecondMachine && (
            <button
              type="button"
              onClick={() => setShowSecondMachine(true)}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all group"
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Agregar segunda máquina</span>
              </div>
              <p className="text-xs mt-1 opacity-75">Para trabajos realizados con múltiples equipos</p>
            </button>
          )}

          {showSecondMachine && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Segunda máquina
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSecondMachine(false);
                    setHoras2(0);
                    setOperador2Id("");
                    setMaquina2Sel("");
                    setMaquina2Libre("");
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-blue-900">
                    Horas adicionales
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.25"
                    value={horas2 || ''}
                    onChange={(e) => setHoras2(Number(e.target.value) || 0)}
                    placeholder="Ej: 1.0"
                    className="h-11"
                  />
                  <p className="text-xs text-blue-700">Tiempo en la segunda máquina</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-blue-900">
                    Operador <span className="text-red-500">*</span>
                  </label>
                  <Select value={operador2Id} onValueChange={setOperador2Id}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar operador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {quicklog.operadores.map(op => (
                        <SelectItem key={op.id} value={op.id} className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {op.nombre}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-700">Operador de la segunda máquina</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-blue-900">
                    Máquina <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={maquina2Sel}
                    onValueChange={(v) => { 
                      setMaquina2Sel(v); 
                      if (v !== "__custom__") setMaquina2Libre(""); 
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar máquina..." />
                    </SelectTrigger>
                    <SelectContent>
                      {quicklog.maquinas.map(m => (
                        <SelectItem key={m.id} value={m.id} className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {m.nombre}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__" className="py-2">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Otra máquina
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {maquina2Sel === "__custom__" && (
                    <Input
                      value={maquina2Libre}
                      onChange={(e) => setMaquina2Libre(e.target.value)}
                      placeholder="Nombre de la máquina"
                      className="h-11 mt-2"
                    />
                  )}
                  <p className="text-xs text-blue-700">Segunda máquina utilizada</p>
                </div>
              </div>
            </div>
          )}

          {/* Notas mejoradas */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Info className="h-4 w-4 text-gray-500" />
              Descripción del trabajo <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Fresado de piezas, cambio de herramienta, problemas encontrados..."
              className="h-11"
            />
            <p className="text-xs text-gray-500 mt-2">
              Detalles adicionales sobre el trabajo realizado, materiales utilizados o observaciones importantes
            </p>
          </div>
        </div>
      )}

      {activeStep === 'pieces' && (
        <div className="space-y-6">
          {/* Estado de completitud */}
          {piecesComplete && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Piezas registradas correctamente</span>
              </div>
            </div>
          )}

          {piezasDisponibles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay piezas pendientes</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Esta orden de trabajo no tiene piezas pendientes de fabricación. 
                Si necesitas registrar piezas, primero selecciona una OT diferente.
              </p>
            </div>
          ) : (
            <>
              {/* Agregar pieza mejorada */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Agregar Piezas Producidas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Pieza fabricada
                    </label>
                    <Select
                      value={piezaSel}
                      onValueChange={setPiezaSel}
                      disabled={piezasDisponibles.length === 0}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccionar pieza..." />
                      </SelectTrigger>
                      <SelectContent>
                        {piezasDisponibles.map(p => (
                          <SelectItem key={p.id} value={p.id} className="py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{p.titulo}</span>
                              <span className="text-sm text-gray-500">
                                Pendiente: {p.pend ?? 'Sin límite'} unidades
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Selecciona la pieza que se fabricó</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Cantidad producida
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={qty || ''}
                      onChange={(e) => setQty(Number(e.target.value) || 1)}
                      placeholder="Ej: 5"
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500">Número de unidades fabricadas</p>
                  </div>

                  <Button
                    onClick={addLine}
                    disabled={!piezaSel || qty <= 0}
                    className="h-11 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>

              {/* Lista de piezas mejorada */}
              {lines.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-600" />
                      Piezas a Registrar
                      <span className="ml-auto bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
                        {totalPiezas} unidades total
                      </span>
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {lines.map((line) => (
                      <div key={line.piezaId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{line.titulo}</div>
                          <div className="text-sm text-gray-500">
                            Pendiente: {line.pend ?? 'Sin límite'}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{line.cantidad}</div>
                            <div className="text-sm text-gray-500">unidades</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.piezaId)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Resumen y acciones mejorados */}
      <div className="pt-6 border-t border-gray-200 space-y-6">
        {/* Resumen mejorado */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Resumen del Registro
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalHoras}</div>
                <div className="text-sm opacity-90">Horas trabajadas</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalPiezas}</div>
                <div className="text-sm opacity-90">Piezas producidas</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${validationState.isValid ? 'bg-green-500' : 'bg-amber-500'}`}>
                {validationState.isValid ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {validationState.isValid ? 'Listo' : 'Pendiente'}
                </div>
                <div className="text-sm opacity-90">
                  {validationState.isValid ? 'Para registrar' : 'Completar datos'}
                </div>
              </div>
            </div>
          </div>
          
          {validationState.isValid && (
            <div className="mt-4 p-3 bg-green-500 bg-opacity-20 rounded-lg border border-green-400">
              <div className="flex items-center gap-2 text-green-100">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">¡Todo listo para registrar la producción!</span>
              </div>
            </div>
          )}
        </div>

        {/* Botones mejorados */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button 
            variant="outline" 
            onClick={clearAll} 
            disabled={isSubmitting}
            className="sm:w-auto border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpiar Formulario
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!validationState.isValid || isSubmitting || !otId}
            className={`sm:w-auto transition-all ${
              validationState.isValid 
                ? 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Registrar Producción
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
