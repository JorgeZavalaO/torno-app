"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Wrench, Plus, AlertTriangle, ArrowRightLeft, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { mountToolOnMachine, unmountToolFromMachine, updateToolStatus } from "@/app/(protected)/inventario/tools-actions";

type Tool = {
  id: string;
  codigo: string;
  estado: string;
  vidaAcumulada: number;
  vidaUtilEstimada: number | null;
  producto: {
    nombre: string;
    sku: string;
    uom: string;
  };
};

type AvailableTool = {
  id: string;
  codigo: string;
  estado: string;
  vidaAcumulada: number;
  costoInicial: number;
  producto: {
    nombre: string;
    sku: string;
    uom: string;
  };
};

interface MachineToolsProps {
  maquinaId: string;
  mountedTools: Tool[];
  availableTools: AvailableTool[]; // Herramientas libres para montar
}

export function MachineTools({ maquinaId, mountedTools, availableTools }: MachineToolsProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mountOpen, setMountOpen] = useState(false);
  const [selectedProductSku, setSelectedProductSku] = useState<string>("");
  const [selectedToolId, setSelectedToolId] = useState<string>("");
  
  // Estado para diálogo de baja/rotura
  const [breakOpen, setBreakOpen] = useState(false);
  const [toolToBreak, setToolToBreak] = useState<Tool | null>(null);
  const [breakReason, setBreakReason] = useState<"ROTA" | "DESGASTADA">("ROTA");

  const handleMount = () => {
    if (!selectedToolId) return;
    start(async () => {
      const res = await mountToolOnMachine(selectedToolId, maquinaId);
      if (res.ok) {
        toast.success("Herramienta montada correctamente");
        setMountOpen(false);
        setSelectedProductSku("");
        setSelectedToolId("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleUnmount = (toolId: string) => {
    start(async () => {
      const res = await unmountToolFromMachine(toolId);
      if (res.ok) {
        toast.success("Herramienta desmontada (devuelta a almacén)");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleReportBreak = () => {
    if (!toolToBreak) return;
    start(async () => {
      // Usamos updateToolStatus que ya maneja el recálculo si es estado terminal
      const res = await updateToolStatus(toolToBreak.id, breakReason);
      if (res.ok) {
        toast.success(`Herramienta reportada como ${breakReason}`);
        setBreakOpen(false);
        setToolToBreak(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const getLifePercentage = (tool: Tool) => {
    if (!tool.vidaUtilEstimada || tool.vidaUtilEstimada <= 0) return 0;
    const pct = (tool.vidaAcumulada / tool.vidaUtilEstimada) * 100;
    return Math.min(pct, 100);
  };

  const getLifeColor = (pct: number) => {
    if (pct > 90) return "bg-red-500";
    if (pct > 75) return "bg-amber-500";
    return "bg-green-500";
  };

  // Agrupar herramientas disponibles por producto
  const toolsByProduct = useMemo(() => {
    const grouped: Record<string, AvailableTool[]> = {};
    availableTools.forEach((tool) => {
      const sku = tool.producto.sku;
      if (!grouped[sku]) {
        grouped[sku] = [];
      }
      grouped[sku].push(tool);
    });
    return grouped;
  }, [availableTools]);

  // Herramientas del producto seleccionado
  const toolsForSelectedProduct = selectedProductSku ? toolsByProduct[selectedProductSku] || [] : [];

  // Herramienta seleccionada (para mostrar detalles)
  const selectedTool = selectedToolId ? availableTools.find((t) => t.id === selectedToolId) : null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Herramientas Montadas</CardTitle>
              <CardDescription>Gestión de herramientas activas en esta máquina</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setMountOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Montar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mountedTools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay herramientas asignadas a esta máquina</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mountedTools.map((tool) => {
              const lifePct = getLifePercentage(tool);
              return (
                <div key={tool.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {tool.codigo}
                      </Badge>
                      <span className="font-medium truncate">{tool.producto.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Acumulado: {Number(tool.vidaAcumulada).toFixed(1)} {tool.producto.uom}</span>
                      {tool.vidaUtilEstimada && (
                        <span className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getLifeColor(lifePct)} transition-all`} 
                              style={{ width: `${lifePct}%` }} 
                            />
                          </div>
                          {lifePct.toFixed(0)}% vida
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() => handleUnmount(tool.id)}
                      title="Desmontar (Devolver a almacén)"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setToolToBreak(tool);
                        setBreakOpen(true);
                      }}
                      title="Reportar Rotura/Desgaste"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal Montar Herramienta */}
      <Dialog open={mountOpen} onOpenChange={setMountOpen}>
        <DialogContent className="!max-w-3xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Montar Herramienta</DialogTitle>
            <DialogDescription>
              Selecciona el producto y luego elige la serie específica que deseas montar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-5">
            {availableTools.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-900">No hay herramientas disponibles</p>
                <p className="text-xs text-amber-700 mt-1">
                  Asegúrate de que haya productos de categoría &quot;Herramienta&quot; o &quot;Herramienta-Corte&quot; con estado NUEVA o AFILADO en el inventario y que no estén montadas en otras máquinas.
                </p>
              </div>
            ) : (
              <>
                {/* Step 1: Seleccionar Producto */}
                <div>
                  <Label className="mb-2 block font-medium">1. Seleccionar Producto</Label>
                  <Select value={selectedProductSku} onValueChange={(val) => {
                    setSelectedProductSku(val);
                    setSelectedToolId(""); // Reset serie al cambiar producto
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir producto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(toolsByProduct).map(([sku, tools]) => {
                        const producto = tools[0].producto;
                        return (
                          <SelectItem key={sku} value={sku}>
                            <span className="font-mono text-muted-foreground mr-2">[{sku}]</span>
                            {producto.nombre} ({tools.length} disponible{tools.length !== 1 ? 's' : ''})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Seleccionar Serie */}
                {selectedProductSku && (
                  <div>
                    <Label className="mb-2 block font-medium">2. Seleccionar Serie / Instancia</Label>
                    <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir serie..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {toolsForSelectedProduct.map((tool) => (
                          <SelectItem key={tool.id} value={tool.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{tool.codigo}</span>
                              <Badge variant="outline" className="text-xs">
                                {tool.estado === "NUEVA" ? "✨ Nueva" : "⚙️ Afilada"}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Step 3: Mostrar Detalles */}
                {selectedTool && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <div className="text-sm font-medium text-blue-900">Detalles de la Herramienta</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Serie:</span>
                        <p className="font-mono font-semibold">{selectedTool.codigo}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estado:</span>
                        <p className="font-semibold">
                          {selectedTool.estado === "NUEVA" ? "✨ Nueva" : "⚙️ Afilada"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Productos Fabricados:</span>
                        <p className="font-semibold">{Number(selectedTool.vidaAcumulada).toFixed(1)} {selectedTool.producto.uom}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Costo Inicial:</span>
                        <p className="font-semibold">${Number(selectedTool.costoInicial).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setMountOpen(false);
              setSelectedProductSku("");
              setSelectedToolId("");
            }}>
              Cancelar
            </Button>
            <Button onClick={handleMount} disabled={!selectedToolId || pending || availableTools.length === 0}>
              {pending ? "Montando..." : "Montar Herramienta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reportar Rotura */}
      <Dialog open={breakOpen} onOpenChange={setBreakOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Reportar Baja de Herramienta
            </DialogTitle>
            <DialogDescription>
              Esto dará de baja la herramienta <strong>{toolToBreak?.codigo}</strong> y recalculará los costos de las OTs afectadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo de la baja</Label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all ${breakReason === "ROTA" ? "border-red-500 bg-red-50 ring-1 ring-red-500" : "hover:bg-accent"}`}
                  onClick={() => setBreakReason("ROTA")}
                >
                  <Trash2 className="h-6 w-6 text-red-500" />
                  <span className="font-medium text-sm">Rotura Prematura</span>
                </div>
                <div 
                  className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all ${breakReason === "DESGASTADA" ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "hover:bg-accent"}`}
                  onClick={() => setBreakReason("DESGASTADA")}
                >
                  <History className="h-6 w-6 text-amber-500" />
                  <span className="font-medium text-sm">Desgaste Natural</span>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground">
              <p>⚠️ <strong>Importante:</strong> Esta acción es irreversible. La herramienta quedará inutilizable y se ajustarán los costos históricos.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBreakOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReportBreak} disabled={pending}>
              {pending ? "Procesando..." : "Confirmar Baja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
