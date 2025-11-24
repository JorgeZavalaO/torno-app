"use client";

import { useState, useTransition, useMemo, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, AlertTriangle, ArrowRightLeft, Trash2, History, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { mountToolOnMachine, unmountToolFromMachine, updateToolStatus } from "@/app/(protected)/inventario/tools-actions";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  
  // Estados para el flujo de selección paso a paso
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedProductSku, setSelectedProductSku] = useState<string>("");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");

  // Estado para diálogo de baja/rotura
  const [breakOpen, setBreakOpen] = useState(false);
  const [toolToBreak, setToolToBreak] = useState<Tool | null>(null);
  const [breakReason, setBreakReason] = useState<"ROTA" | "DESGASTADA">("ROTA");

  const handleMount = () => {
    if (selectedToolIds.size === 0) return;
    start(async () => {
      const toolIds = Array.from(selectedToolIds);
      // Ejecutar montajes en paralelo para reducir tiempo total
      const results = await Promise.allSettled(toolIds.map(id => mountToolOnMachine(id, maquinaId)));

      let mountedCount = 0;
      let errorCount = 0;

      results.forEach(r => {
        if (r.status === "fulfilled") {
          if (r.value.ok) mountedCount++; else errorCount++;
        } else {
          errorCount++;
        }
      });

      if (mountedCount > 0) {
        toast.success(`${mountedCount} herramienta${mountedCount !== 1 ? 's' : ''} montada${mountedCount !== 1 ? 's' : ''}`);
        setMountOpen(false);
        setSelectedToolIds(new Set());
        // Trigger refresh sin bloquear - ejecuta en paralelo
        startTransition(() => router.refresh());
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} error${errorCount !== 1 ? 'es' : ''} al montar`);
      }
      if (mountedCount === 0 && errorCount === 0) {
        toast.error("No se pudo procesar el montaje");
      }
    });
  };

  const handleUnmount = (toolId: string) => {
    start(async () => {
      const res = await unmountToolFromMachine(toolId);
      if (res.ok) {
        toast.success("Herramienta desmontada (devuelta a almacén)");
        // Trigger refresh sin bloquear - ejecuta en paralelo
        startTransition(() => router.refresh());
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
        // Trigger refresh sin bloquear - ejecuta en paralelo
        startTransition(() => router.refresh());
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

  // Herramientas seleccionadas
  const selectedTools = useMemo(() => {
    return Array.from(selectedToolIds)
      .map(id => availableTools.find(t => t.id === id))
      .filter(Boolean) as AvailableTool[];
  }, [selectedToolIds, availableTools]);

  // Agrupar herramientas disponibles por producto (para el resumen)
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

  // Lista de productos únicos para el Combobox
  const uniqueProducts = useMemo(() => {
    return Object.entries(toolsByProduct).map(([sku, tools]) => ({
      sku,
      nombre: tools[0].producto.nombre,
      count: tools.length
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [toolsByProduct]);

  // Instancias disponibles del producto seleccionado (excluyendo las ya seleccionadas para montar)
  const availableInstancesForProduct = useMemo(() => {
    if (!selectedProductSku) return [];
    const tools = toolsByProduct[selectedProductSku] || [];
    return tools.filter(t => !selectedToolIds.has(t.id));
  }, [selectedProductSku, toolsByProduct, selectedToolIds]);

  const handleAddTool = () => {
    if (selectedInstanceId) {
      const newSelected = new Set(selectedToolIds);
      newSelected.add(selectedInstanceId);
      setSelectedToolIds(newSelected);
      
      // Resetear selección de instancia pero mantener producto para facilitar agregar otra del mismo tipo
      setSelectedInstanceId("");
      toast.success("Herramienta agregada a la lista");
    }
  };

  const handleRemoveTool = (id: string) => {
    const newSelected = new Set(selectedToolIds);
    newSelected.delete(id);
    setSelectedToolIds(newSelected);
  };

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

      {/* Modal Montar Herramientas */}
      <Dialog open={mountOpen} onOpenChange={(open) => {
        setMountOpen(open);
        if (!open) {
          setSelectedProductSku("");
          setSelectedInstanceId("");
          setSelectedToolIds(new Set());
        }
      }}>
        <DialogContent className="!max-w-3xl w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Montar Herramientas</DialogTitle>
            <DialogDescription>
              Selecciona las herramientas paso a paso para montarlas en la máquina.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {availableTools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-muted/30 rounded-lg border border-dashed">
                <div className="p-3 bg-amber-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">No hay herramientas disponibles</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    No se encontraron herramientas con estado NUEVA o AFILADO en el inventario que no estén ya montadas.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Zona de Selección */}
                <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                    <h3 className="font-medium">Agregar Herramienta</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Paso 1: Buscar Producto */}
                    <div className="space-y-2">
                      <Label>Producto / Tipo</Label>
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full justify-between"
                          >
                            {selectedProductSku
                              ? uniqueProducts.find((p) => p.sku === selectedProductSku)?.nombre
                              : "Buscar producto..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por nombre o SKU..." />
                            <CommandList>
                              <CommandEmpty>No se encontró el producto.</CommandEmpty>
                              <CommandGroup>
                                {uniqueProducts.map((product) => (
                                  <CommandItem
                                    key={product.sku}
                                    value={product.nombre}
                                    onSelect={() => {
                                      setSelectedProductSku(product.sku === selectedProductSku ? "" : product.sku);
                                      setSelectedInstanceId(""); // Reset instancia
                                      setOpenCombobox(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedProductSku === product.sku ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{product.nombre}</span>
                                      <span className="text-xs text-muted-foreground">SKU: {product.sku} ({product.count})</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Paso 2: Seleccionar Serie */}
                    <div className="space-y-2">
                      <Label>Serie / Instancia</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={selectedInstanceId} 
                          onValueChange={setSelectedInstanceId}
                          disabled={!selectedProductSku || availableInstancesForProduct.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={
                              !selectedProductSku 
                                ? "Primero elige un producto" 
                                : availableInstancesForProduct.length === 0 
                                  ? "Sin stock disponible" 
                                  : "Seleccionar serie..."
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {availableInstancesForProduct.map((tool) => (
                              <SelectItem key={tool.id} value={tool.id}>
                                <span className="font-mono font-medium mr-2">{tool.codigo}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({tool.estado === "NUEVA" ? "NUEVA" : "AFILADO"})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleAddTool}
                          disabled={!selectedInstanceId}
                          size="icon"
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Herramientas a Montar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
                      <h3 className="font-medium">Herramientas a Montar ({selectedTools.length})</h3>
                    </div>
                    {selectedTools.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
                        onClick={() => setSelectedToolIds(new Set())}
                      >
                        Limpiar todo
                      </Button>
                    )}
                  </div>

                  {selectedTools.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground bg-muted/10">
                      <Wrench className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No has seleccionado ninguna herramienta aún.</p>
                      <p className="text-xs mt-1">Usa el formulario de arriba para agregar herramientas.</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto bg-card">
                      {selectedTools.map((tool) => (
                        <div key={tool.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {tool.producto.sku.slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{tool.producto.nombre}</span>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {tool.codigo}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span>{tool.estado}</span>
                                <span>•</span>
                                <span>Vida: {Number(tool.vidaAcumulada).toFixed(1)} {tool.producto.uom}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveTool(tool.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10">
            <Button variant="outline" onClick={() => {
              setMountOpen(false);
              setSelectedToolIds(new Set());
            }}>
              Cancelar
            </Button>
            <Button onClick={handleMount} disabled={selectedToolIds.size === 0 || pending || availableTools.length === 0}>
              {pending ? "Montando..." : `Montar ${selectedToolIds.size > 0 ? `(${selectedToolIds.size})` : ''}`}
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
