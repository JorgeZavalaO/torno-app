"use client";

import { useMemo, useState, startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  X
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
  lines: Line[]
) => {
  return useMemo(() => {
    const errors: { field: string; message: string }[] = [];

    if (!otId) errors.push({ field: 'ot', message: 'Selecciona una orden de trabajo' });
    
    const hasValidHours = (Number.isFinite(horas) && horas > 0) || 
                         (showSecondMachine && Number.isFinite(horas2) && horas2 > 0);
    const hasPieces = lines.length > 0;
    
    if (!hasValidHours && !hasPieces) {
      errors.push({ field: 'general', message: 'Registra horas, piezas, o ambos' });
    }

    return { errors, isValid: errors.length === 0 };
  }, [otId, horas, horas2, showSecondMachine, lines.length]);
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
  const [otId, setOtId] = useState<string>(inProgressOTs[0]?.id ?? "");
  const selectedOT = quicklog.ots.find(o => o.id === otId);

  // Estados para UI - Simplificados
  const [activeStep, setActiveStep] = useState<'work' | 'pieces'>('work');
  const [showSecondMachine, setShowSecondMachine] = useState(false);

  // Estados principales
  const [horas, setHoras] = useState<number>(1);
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

  // Validación usando hook personalizado
  const validationState = useValidation(otId, horas, horas2, showSecondMachine, lines);

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
    setHoras(1);
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
    if (!canWrite || !validationState.isValid) return;

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
        const entry1 = { id: id1 || undefined, nombre: m1 || "", horas: h1 } as Record<string, unknown>;
        if (operadorId?.trim()) (entry1 as Record<string, string>)['userId'] = operadorId.trim();
        maquinas.push(entry1 as { id?: string; nombre: string; horas: number });
      }

      if (showSecondMachine) {
        const h2 = Number(horas2);
        if (Number.isFinite(h2) && h2 > 0) {
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin permisos de escritura</h3>
        <p className="text-gray-600">No tienes autorización para registrar producción.</p>
      </div>
    );
  }

  if (quicklog.ots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Info className="h-12 w-12 text-blue-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin órdenes activas</h3>
        <p className="text-gray-600">No hay órdenes de trabajo abiertas o en proceso.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header con OT */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <SelectTrigger className="w-full h-11">
            <SelectValue placeholder="Selecciona una orden de trabajo..." />
          </SelectTrigger>
          <SelectContent>
            {inProgressOTs.map(ot => (
              <SelectItem key={ot.id} value={ot.id} className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{ot.codigo}</span>
                  <span className="text-sm text-gray-500">En proceso</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alertas */}
      {validationState.errors.length > 0 && (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded text-red-700 text-sm">
          {validationState.errors[0].message}
        </div>
      )}

      {/* Navegación simple */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveStep('work')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeStep === 'work'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="inline h-4 w-4 mr-2" />
          Trabajo
        </button>
        <button
          onClick={() => setActiveStep('pieces')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeStep === 'pieces'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="inline h-4 w-4 mr-2" />
          Piezas {lines.length > 0 && (
            <span className="ml-1 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">{lines.length}</span>
          )}
        </button>
      </div>

      {/* Contenido dinámico */}
      {activeStep === 'work' && (
        <div className="space-y-6">
          {/* Formulario de trabajo en grid simple */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Horas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horas trabajadas
              </label>
              <Input
                type="number"
                min={0.25}
                step="0.25"
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                placeholder="1.5"
                className="h-11"
              />
            </div>

            {/* Operador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operador
              </label>
              <Select value={operadorId} onValueChange={setOperadorId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar operador" />
                </SelectTrigger>
                <SelectContent>
                  {quicklog.operadores.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Máquina */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máquina
              </label>
              <Select
                value={maquinaSel}
                onValueChange={(v) => { 
                  setMaquinaSel(v); 
                  if (v !== "__custom__") setMaquinaLibre(""); 
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar máquina" />
                </SelectTrigger>
                <SelectContent>
                  {quicklog.maquinas.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">✏️ Otra máquina</SelectItem>
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
            </div>
          </div>

          {/* Segunda máquina (opcional) */}
          {!showSecondMachine && (
            <button
              type="button"
              onClick={() => setShowSecondMachine(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all"
            >
              <Plus className="inline h-4 w-4 mr-2" />
              Agregar segunda máquina
            </button>
          )}

          {showSecondMachine && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-blue-900">Segunda máquina</h4>
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
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas
                  </label>
                  <Input
                    type="number"
                    min={0.25}
                    step="0.25"
                    value={horas2}
                    onChange={(e) => setHoras2(Number(e.target.value))}
                    placeholder="1.0"
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operador
                  </label>
                  <Select value={operador2Id} onValueChange={setOperador2Id}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar operador" />
                    </SelectTrigger>
                    <SelectContent>
                      {quicklog.operadores.map(op => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máquina
                  </label>
                  <Select
                    value={maquina2Sel}
                    onValueChange={(v) => { 
                      setMaquina2Sel(v); 
                      if (v !== "__custom__") setMaquina2Libre(""); 
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar máquina" />
                    </SelectTrigger>
                    <SelectContent>
                      {quicklog.maquinas.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">✏️ Otra máquina</SelectItem>
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
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del trabajo (opcional)
            </label>
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Operación realizada, materiales usados, observaciones..."
              className="h-11"
            />
          </div>
        </div>
      )}

      {activeStep === 'pieces' && (
        <div className="space-y-6">
          {piezasDisponibles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No hay piezas pendientes en esta orden</p>
            </div>
          ) : (
            <>
              {/* Agregar pieza */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pieza
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
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{p.titulo}</span>
                              <span className="text-sm text-gray-500">
                                Pendiente: {p.pend ?? 'Sin límite'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="h-11"
                    />
                  </div>

                  <Button
                    onClick={addLine}
                    disabled={!piezaSel || qty <= 0}
                    className="h-11"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>

              {/* Lista de piezas */}
              {lines.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="font-medium text-gray-900">Piezas a registrar</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pieza</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => (
                        <TableRow key={line.piezaId}>
                          <TableCell className="font-medium">{line.titulo}</TableCell>
                          <TableCell className="text-right">{line.cantidad}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(line.piezaId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Resumen y acciones */}
      <div className="pt-6 border-t space-y-4">
        {/* Resumen */}
        <div className="flex justify-between items-center p-4 bg-blue-600 text-white rounded-lg">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">{totalHoras}h</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span className="font-medium">{totalPiezas} piezas</span>
            </div>
          </div>
          
          {validationState.isValid && (
            <div className="flex items-center gap-2 text-green-100">
              <CheckCircle className="h-5 w-5" />
              <span>Listo para enviar</span>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button 
            variant="outline" 
            onClick={clearAll} 
            disabled={isSubmitting}
            className="sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpiar todo
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!validationState.isValid || isSubmitting || !otId}
            className="sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
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
