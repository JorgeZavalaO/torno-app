"use client";

import { useState, useMemo, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Clock, Package, Plus, Save, RefreshCw } from "lucide-react";
import type { QuickLog, Actions } from "./types";

interface QuickRegistrationProps {
  quicklog: QuickLog;
  actions: Actions;
  canWrite: boolean;
}

export function QuickRegistration({ quicklog, actions, canWrite }: QuickRegistrationProps) {
  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  // Estados para registro de horas
  const [otHoras, setOtHoras] = useState<string>(quicklog.ots[0]?.id ?? "");
  const [horas, setHoras] = useState<number>(1);
  const [maquina, setMaquina] = useState("");
  const [nota, setNota] = useState("");
  const [isSubmittingHours, setIsSubmittingHours] = useState(false);

  // Estados para registro de piezas
  const [otPiezas, setOtPiezas] = useState<string>(quicklog.ots[0]?.id ?? "");
  const [piezaSel, setPiezaSel] = useState<string>("");
  const [qtyFin, setQtyFin] = useState<number>(1);
  const [isSubmittingPieces, setIsSubmittingPieces] = useState(false);

  const piezasDeOTSel = useMemo(() => {
    const ot = quicklog.ots.find((o) => o.id === otPiezas);
    return ot?.piezas ?? [];
  }, [quicklog.ots, otPiezas]);

  const selectedOTHoras = quicklog.ots.find(o => o.id === otHoras);
  const selectedOTPiezas = quicklog.ots.find(o => o.id === otPiezas);
  const selectedPieza = piezasDeOTSel.find(p => p.id === piezaSel);

  const handleLogHours = async () => {
    if (!otHoras) {
      toast.error("Selecciona una orden de trabajo");
      return;
    }

    setIsSubmittingHours(true);
    try {
      const fd = new FormData();
      fd.set("otId", otHoras);
      fd.set("horas", String(horas));
      if (maquina.trim()) fd.set("maquina", maquina.trim());
      if (nota.trim()) fd.set("nota", nota.trim());
      
      const result = await actions.logProduction(fd);
      
      if (result.ok) {
        toast.success(result.message || "Horas registradas correctamente");
        setHoras(1);
        setMaquina("");
        setNota("");
        refresh();
      } else {
        toast.error(result.message || "Error al registrar las horas");
      }
    } catch (error) {
      toast.error("Error inesperado al registrar las horas");
      console.error("Error logging hours:", error);
    } finally {
      setIsSubmittingHours(false);
    }
  };

  const handleLogPieces = async () => {
    if (!otPiezas) {
      toast.error("Selecciona una orden de trabajo");
      return;
    }
    if (!piezaSel) {
      toast.error("Selecciona una pieza");
      return;
    }

    setIsSubmittingPieces(true);
    try {
      const fd = new FormData();
      fd.set("otId", otPiezas);
      fd.set("items", JSON.stringify([{ piezaId: piezaSel, cantidad: Number(qtyFin) }]));
      
      const result = await actions.logFinishedPieces(fd);
      
      if (result.ok) {
        toast.success(result.message || "Piezas registradas correctamente");
        setQtyFin(1);
        setPiezaSel("");
        refresh();
      } else {
        toast.error(result.message || "Error al registrar las piezas");
      }
    } catch (error) {
      toast.error("Error inesperado al registrar las piezas");
      console.error("Error logging pieces:", error);
    } finally {
      setIsSubmittingPieces(false);
    }
  };

  if (!canWrite) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sin permisos de escritura</h3>
            <p className="text-muted-foreground mt-1">
              No tienes permisos para registrar producción en el sistema.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (quicklog.ots.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sin órdenes activas</h3>
            <p className="text-muted-foreground mt-1">
              No hay órdenes de trabajo abiertas o en proceso para registrar producción.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Registro de horas */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Registrar Horas</h3>
            <p className="text-sm text-muted-foreground">
              Registra el tiempo trabajado en una orden
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Selección de OT */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Orden de Trabajo *
            </label>
            <select
              value={otHoras}
              onChange={(e) => setOtHoras(e.target.value)}
              className="w-full h-10 border rounded-md px-3 bg-background"
              disabled={isSubmittingHours}
            >
              {quicklog.ots.map((ot) => (
                <option key={ot.id} value={ot.id}>
                  {ot.codigo} ({ot.estado === "OPEN" ? "Abierta" : "En proceso"})
                </option>
              ))}
            </select>
            {selectedOTHoras && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {selectedOTHoras.piezas.length} piezas pendientes
                </Badge>
              </div>
            )}
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                Horas trabajadas *
              </label>
              <Input
                type="number"
                min={0.25}
                step="0.25"
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                placeholder="1.5"
                disabled={isSubmittingHours}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                Máquina utilizada
              </label>
              <Input
                value={maquina}
                onChange={(e) => setMaquina(e.target.value)}
                placeholder="Ej: Torno CNC #1"
                disabled={isSubmittingHours}
              />
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Descripción del trabajo
            </label>
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Operación realizada, materiales usados, etc..."
              disabled={isSubmittingHours}
            />
          </div>

          <Separator />

          {/* Botón de guardar */}
          <Button
            onClick={handleLogHours}
            disabled={!otHoras || horas <= 0 || isSubmittingHours}
            className="w-full"
          >
            {isSubmittingHours ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Registrar Horas
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Registro de piezas terminadas */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Registrar Piezas</h3>
            <p className="text-sm text-muted-foreground">
              Marca piezas como terminadas
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Selección de OT */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Orden de Trabajo *
            </label>
            <select
              value={otPiezas}
              onChange={(e) => {
                setOtPiezas(e.target.value);
                setPiezaSel("");
              }}
              className="w-full h-10 border rounded-md px-3 bg-background"
              disabled={isSubmittingPieces}
            >
              {quicklog.ots.map((ot) => (
                <option key={ot.id} value={ot.id}>
                  {ot.codigo} ({ot.estado === "OPEN" ? "Abierta" : "En proceso"})
                </option>
              ))}
            </select>
            {selectedOTPiezas && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {selectedOTPiezas.piezas.length} tipos de piezas
                </Badge>
              </div>
            )}
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium block mb-2">
                Tipo de pieza *
              </label>
              <select
                value={piezaSel}
                onChange={(e) => setPiezaSel(e.target.value)}
                className="w-full h-10 border rounded-md px-3 bg-background"
                disabled={isSubmittingPieces || piezasDeOTSel.length === 0}
              >
                <option value="">Seleccione una pieza...</option>
                {piezasDeOTSel.map((pieza) => (
                  <option key={pieza.id} value={pieza.id}>
                    {pieza.titulo} (pendientes: {pieza.pend})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                Cantidad *
              </label>
              <Input
                type="number"
                min={1}
                value={qtyFin}
                onChange={(e) => setQtyFin(Number(e.target.value))}
                placeholder="1"
                disabled={isSubmittingPieces}
              />
            </div>
          </div>

          {/* Info de la pieza seleccionada */}
          {selectedPieza && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <strong>Pieza:</strong> {selectedPieza.titulo}
              </div>
              <div className="text-sm text-muted-foreground">
                Cantidad pendiente: <strong>{selectedPieza.pend}</strong> unidades
              </div>
            </div>
          )}

          <Separator />

          {/* Botón de guardar */}
          <Button
            onClick={handleLogPieces}
            disabled={!otPiezas || !piezaSel || qtyFin <= 0 || isSubmittingPieces}
            className="w-full"
          >
            {isSubmittingPieces ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Piezas
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
