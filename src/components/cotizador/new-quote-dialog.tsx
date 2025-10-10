"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Calculator, 
  Save, 
  Loader2, 
  User, 
  Settings, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Package,
  DollarSign,
  Info
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuoteLinesEditor, PiezaLine, MaterialLine } from "./quote-lines-editor";
import { getTiposTrabajo } from "@/app/(protected)/cotizador/actions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Client = { id: string; nombre: string; ruc: string };
type CostingParams = Record<string, string | number>;
type CreateQuoteAction = (fd: FormData) => Promise<{ ok: boolean; id?: string; message?: string }>;

type TipoTrabajo = { id: string; nombre: string; descripcion: string | null; propiedades?: unknown; codigo: string };
type TiposTrabajoResponse = {
  principales: TipoTrabajo[];
  subcategorias: TipoTrabajo[];
};

interface NewQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  params: CostingParams;
  machineCategories: Array<{ id: string; categoria: string; laborCost: number; deprPerHour: number }>;
  action: CreateQuoteAction;
}

export function NewQuoteDialog({ 
  open, 
  onOpenChange, 
  clients, 
  params,
  machineCategories, 
  action 
}: NewQuoteDialogProps) {
  const currency = String(params.currency || "PEN");
  const [clienteId, setClienteId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [materials, setMaterials] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [machineCategory, setMachineCategory] = useState<string>(""); // Nueva categoría
  // kwh eliminado - ya no es necesario con el nuevo modelo de costeo
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [pedidoReferencia, setPedidoReferencia] = useState<string>("");
  const [tipoTrabajoId, setTipoTrabajoId] = useState<string>("");
  const [tipoTrabajoSubcategoriaId, setTipoTrabajoSubcategoriaId] = useState<string>("");
  const [tiposTrabajo, setTiposTrabajo] = useState<TiposTrabajoResponse | null>(null);
  const [piezasLines, setPiezasLines] = useState<PiezaLine[]>([]);
  const [materialesLines, setMaterialesLines] = useState<MaterialLine[]>([]);
  // Eliminado forceMaterials: siempre se autocalcula desde líneas de detalle cuando existen
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const gi = Number(params.gi ?? 0);
  const margin = Number(params.margin ?? 0);
  
  // Obtener costos según categoría seleccionada
  const selectedCategory = machineCategories.find(c => c.categoria === machineCategory);
  const hourlyRate = selectedCategory?.laborCost ?? Number(params.hourlyRate ?? 0);
  const depr = selectedCategory?.deprPerHour ?? Number(params.deprPerHour ?? 0);
  const kwhRate = Number(params.kwhRate ?? 0);
  const tooling = Number(params.toolingPerPiece ?? 0);
  const rent = Number(params.rentPerHour ?? 0);

  // Cálculo basado siempre en estados (materials / qty) que se sincronizan con líneas si existen
  const calculation = useMemo(() => {
    const labor = hourlyRate * hours;
    const energy = kwhRate * hours; 
    const depreciation = depr * hours;
    const toolingCost = tooling * qty;
    const rentCost = rent * hours;
    const direct = materials + labor + energy + depreciation + toolingCost + rentCost;
    const giAmount = direct * gi;
    const subtotal = direct + giAmount;
    const marginAmount = subtotal * margin;
    const total = subtotal + marginAmount;
    const unitPrice = qty > 0 ? total / qty : total;
    
    return { 
      labor, energy, depreciation, toolingCost, rentCost, 
      direct, giAmount, subtotal, marginAmount, total, unitPrice 
    };
  }, [materials, hours, qty, gi, margin, hourlyRate, kwhRate, depr, tooling, rent]);

  const formatCurrency = (amount: number, c: string = currency) =>
    new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: c 
    }).format(amount || 0);

  const resetForm = () => {
    setClienteId("");
    setQty(1);
    setMaterials(0);
    setHours(0);
    setMachineCategory(""); 
    setNotes("");
    setPedidoReferencia("");
    setTipoTrabajoId("");
    setTipoTrabajoSubcategoriaId("");
    setPiezasLines([]);
    setMaterialesLines([]);
  };

  const handleSubmit = () => {
    if (!clienteId) return toast.error("Selecciona un cliente");
    if (qty < 1) return toast.error("La cantidad mínima es 1");

  const formData = new FormData();
    formData.set("clienteId", clienteId);
  formData.set("qty", String(qty));
  formData.set("materials", String(materials));
    formData.set("hours", String(hours));
    if (machineCategory) formData.set("machineCategory", machineCategory);
  if (validUntil) formData.set("validUntil", validUntil);
    if (notes) formData.set("notes", notes);
  if (pedidoReferencia) formData.set("pedidoReferencia", pedidoReferencia);
  if (tipoTrabajoSubcategoriaId) formData.set("tipoTrabajoId", tipoTrabajoSubcategoriaId);
  else if (tipoTrabajoId) formData.set("tipoTrabajoId", tipoTrabajoId);
  if (piezasLines.length) formData.set("piezas", JSON.stringify(piezasLines));
  if (materialesLines.length) formData.set("materialesDetalle", JSON.stringify(materialesLines));

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success("Cotización creada exitosamente");
        resetForm();
        onOpenChange(false);
        router.refresh();
        if (result.id) {
          window.location.href = `/cotizador/${result.id}`;
        }
      } else {
        toast.error(result.message ?? "Error al crear la cotización");
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !pending) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Establecer fecha por defecto
  useEffect(() => {
    if (open && !validUntil) {
      const date = new Date();
      date.setDate(date.getDate() + 15);
      setValidUntil(date.toISOString().slice(0, 10));
    }
  }, [open, validUntil]);

  // Cargar tipos de trabajo
  useEffect(() => {
    if (open) {
      startTransition(async () => {
        try {
          const tipos = await getTiposTrabajo();
          setTiposTrabajo(tipos as TiposTrabajoResponse);
        } catch (error) {
          console.error("Error loading tipos de trabajo:", error);
        }
      });
    }
  }, [open]);

  // Limpiar subcategoría cuando cambia el tipo principal
  useEffect(() => {
    if (tipoTrabajoId) {
      const tipoSeleccionado = tiposTrabajo?.principales.find(t => t.id === tipoTrabajoId);
      if (tipoSeleccionado?.codigo !== "SERVICIOS") {
        setTipoTrabajoSubcategoriaId("");
      }
    }
  }, [tipoTrabajoId, tiposTrabajo?.principales]);

  // Sincronizar estado de materials con las líneas de materiales
  // Siempre que existan líneas detalladas de materiales, el monto se autocalcula
  useEffect(() => {
    if (materialesLines.length > 0) {
      const totalMaterials = materialesLines.reduce((sum, line) => sum + (line.qty * line.unitCost), 0);
      setMaterials(totalMaterials);
    }
  }, [materialesLines]);

  // Sincronizar cantidad total con las líneas de piezas
  useEffect(() => {
    if (piezasLines.length > 0) {
      const totalQty = piezasLines.reduce((sum, line) => {
        return sum + line.qty;
      }, 0);
      setQty(totalQty);
    }
  }, [piezasLines]);

  // Obtener subcategorías disponibles para el tipo seleccionado
  const subcategoriasDisponibles = useMemo(() => {
    if (!tiposTrabajo || !tipoTrabajoId) return [];
    const tipoSeleccionado = tiposTrabajo.principales.find(t => t.id === tipoTrabajoId);
    if (tipoSeleccionado?.codigo === "SERVICIOS") {
      return tiposTrabajo.subcategorias.filter(s => {
        const props = s.propiedades as { parent?: string; isSubcategory?: boolean };
        return props?.parent === "SERVICIOS";
      });
    }
    return [];
  }, [tiposTrabajo, tipoTrabajoId]);

  return (
  <Dialog open={open} onOpenChange={handleOpenChange}>
  <DialogContent className="max-w-[1400px] max-h-[95vh] w-[98vw] min-w-[75vw] sm:w-[1200px] xl:w-[1400px]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Nueva Cotización
              </div>
              <div className="text-sm font-normal text-slate-500 dark:text-slate-400">
                Completa la información para generar la cotización
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <TabsTrigger 
                value="general" 
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <User className="h-4 w-4" />
                <span className="font-medium">General</span>
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <Package className="h-4 w-4" />
                <span className="font-medium">Detalles y Producción</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <FileText className="h-4 w-4" />
                <span className="font-medium">Observaciones</span>
              </TabsTrigger>
            </TabsList>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contenido principal por pestañas */}
              <div className="lg:col-span-2 space-y-6">
                
                <TabsContent value="general" className="mt-0 space-y-0">
                  <Card className="p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Información General</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Datos básicos de la cotización</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="cliente" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          Cliente
                          <Badge variant="destructive" className="text-xs font-medium">Requerido</Badge>
                        </Label>
                        <Select value={clienteId} onValueChange={setClienteId} disabled={pending}>
                          <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Seleccionar cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex flex-col items-start py-1">
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{client.nombre}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    RUC: {client.ruc}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!clienteId && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Selecciona un cliente para continuar
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="machineCategory" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          Categoría de Máquina
                          {machineCategory && selectedCategory && (
                            <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600">
                              Labor: ${selectedCategory.laborCost}/h • Depr: ${selectedCategory.deprPerHour}/h
                            </Badge>
                          )}
                        </Label>
                        <Select value={machineCategory} onValueChange={setMachineCategory} disabled={pending}>
                          <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Seleccionar categoría..." />
                          </SelectTrigger>
                          <SelectContent>
                            {machineCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.categoria}>
                                <div className="flex flex-col items-start py-1">
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{cat.categoria}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    MO: ${cat.laborCost}/h • Depr: ${cat.deprPerHour}/h
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Selecciona el tipo de máquina para costos específicos
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pedidoReferencia" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pedido de Referencia</Label>
                        <Input
                          id="pedidoReferencia"
                          type="text"
                          placeholder="Número de pedido ERP..."
                          value={pedidoReferencia}
                          onChange={(e) => setPedidoReferencia(e.target.value)}
                          disabled={pending}
                          className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Referencia del pedido en el sistema ERP (opcional)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="validUntil" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Válido hasta</Label>
                        <Input
                          id="validUntil"
                          type="date"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                          disabled={pending}
                          className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Fecha de vencimiento de la cotización
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tipoTrabajo" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Trabajo</Label>
                        <Select value={tipoTrabajoId} onValueChange={setTipoTrabajoId} disabled={pending}>
                          <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Seleccionar tipo de trabajo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposTrabajo?.principales.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                <div className="flex flex-col items-start py-1">
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{tipo.nombre}</div>
                                  {tipo.descripcion && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {tipo.descripcion}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tipo de trabajo para la cotización (opcional)
                        </p>
                      </div>

                      {/* Subcategoría de servicios - solo visible cuando se selecciona "Servicios" */}
                      {subcategoriasDisponibles.length > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor="tipoTrabajoSubcategoria" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Servicio</Label>
                          <Select value={tipoTrabajoSubcategoriaId} onValueChange={setTipoTrabajoSubcategoriaId} disabled={pending}>
                            <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder="Seleccionar tipo de servicio..." />
                            </SelectTrigger>
                            <SelectContent>
                              {subcategoriasDisponibles.map((subcategoria) => (
                                <SelectItem key={subcategoria.id} value={subcategoria.id}>
                                  <div className="flex flex-col items-start py-1">
                                    <div className="font-medium text-slate-900 dark:text-slate-100">{subcategoria.nombre}</div>
                                    {subcategoria.descripcion && (
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {subcategoria.descripcion}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Especifica el tipo de servicio requerido
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="mt-0 space-y-4">
                  {/* Tarjeta de parámetros de producción */}
                  <Card className="p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Parámetros de Producción</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Configura los recursos necesarios</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="qty" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Cantidad (piezas)</span>
                          {piezasLines.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                              Auto-calculado
                            </Badge>
                          )}
                        </Label>
                        <Input
                          id="qty"
                          type="number"
                          min={1}
                          value={qty}
                          onChange={(e) => setQty(Number(e.target.value))}
                          disabled={pending || piezasLines.length > 0}
                          className="h-11 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        {piezasLines.length > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Desde líneas de detalle
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="materials" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Materiales ({currency})</span>
                          {materialesLines.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                              Auto-calculado
                            </Badge>
                          )}
                        </Label>
                        <Input
                          id="materials"
                          type="number"
                          step="0.01"
                          min={0}
                          value={materials}
                          onChange={(e) => setMaterials(Number(e.target.value))}
                          disabled={pending || materialesLines.length > 0}
                          className="h-11 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        {materialesLines.length > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Desde líneas de detalle
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hours" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Horas de torno</Label>
                        <Input
                          id="hours"
                          type="number"
                          step="0.01"
                          min={0}
                          value={hours}
                          onChange={(e) => setHours(Number(e.target.value))}
                          disabled={pending}
                          className="h-11 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tiempo estimado de operación
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Editor de líneas de detalle */}
                  <QuoteLinesEditor
                    piezasLines={piezasLines}
                    setPiezasLines={setPiezasLines}
                    materialesLines={materialesLines}
                    setMaterialesLines={setMaterialesLines}
                    currency={currency}
                    disabled={pending}
                  />
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <Card className="p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Observaciones</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Información adicional sobre la cotización</p>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Notas adicionales sobre la cotización, condiciones especiales, términos de entrega, etc..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={pending}
                      rows={8}
                      className="resize-none border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </Card>
                </TabsContent>
              </div>

              {/* Panel de cálculo - Sticky sidebar */}
              <div className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
                {/* Validación general */}
                {!clienteId && (
                  <Alert className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                      Selecciona un cliente para continuar con la cotización
                    </AlertDescription>
                  </Alert>
                )}

                <Card className="p-5 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">Parámetros del Sistema</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Configuración actual</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col space-y-1 p-2 bg-white dark:bg-slate-950 rounded-lg">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Gastos indirectos</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{(gi * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col space-y-1 p-2 bg-white dark:bg-slate-950 rounded-lg">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Margen de ganancia</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{(margin * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col space-y-1 p-2 bg-white dark:bg-slate-950 rounded-lg">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Tarifa/hora</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(hourlyRate)}</span>
                      </div>
                      <div className="flex flex-col space-y-1 p-2 bg-white dark:bg-slate-950 rounded-lg">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Tarifa kWh</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(kwhRate)}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                        <Calculator className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-blue-900 dark:text-blue-100">Desglose de Costos</h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Cálculo en tiempo real</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Materiales con tooltip de detalle */}
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              Materiales
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[320px] text-left break-words">
                                  <div className="space-y-1">
                                    {materialesLines.length > 0 ? (
                                      <>
                                        <div className="font-semibold">Detalle de materiales ({materialesLines.length}):</div>
                                        <div className="space-y-0.5">
                                          {materialesLines.slice(0, 6).map((m, i) => (
                                            <div key={i} className="flex justify-between gap-2">
                                              <span className="text-xs text-primary-foreground/90 truncate">
                                                {(m.descripcion || m.productoId || "Material").toString()}
                                                {" · "}{m.qty} x {formatCurrency(m.unitCost)}
                                              </span>
                                              <span className="text-xs font-semibold">{formatCurrency(m.qty * m.unitCost)}</span>
                                            </div>
                                          ))}
                                          {materialesLines.length > 6 && (
                                            <div className="text-[11px] opacity-90">… y {materialesLines.length - 6} más</div>
                                          )}
                                        </div>
                                        <div className="pt-1 mt-1 border-t border-white/30 text-xs flex justify-between">
                                          <span>Total materiales</span>
                                          <span className="font-semibold">{formatCurrency(materials)}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-xs">Monto manual o sin detalle.</div>
                                        <div className="text-xs flex justify-between"><span>Total</span><span className="font-semibold">{formatCurrency(materials)}</span></div>
                                      </>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </span>
                            {materialesLines.length > 0 && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                Detallado
                              </Badge>
                            )}
                            {/* Badge 'Forzado' eliminado: ya no existe modo forzado */}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(materials)}</span>
                        </div>
                        {/* Checkbox de forzado eliminado */}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            Mano de obra
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px] text-left">
                                <div className="text-xs space-y-1">
                                  <div>
                                    Tarifa: <span className="font-semibold">{formatCurrency(hourlyRate)}</span> / h
                                  </div>
                                  <div>
                                    Horas: <span className="font-semibold">{hours.toFixed(2)}</span> h
                                  </div>
                                  <div className="pt-1 mt-1 border-t border-white/30 flex justify-between">
                                    <span>Total mano de obra</span>
                                    <span className="font-semibold">{formatCurrency(calculation.labor)}</span>
                                  </div>
                                  {selectedCategory && (
                                    <div className="opacity-90">Categoría: <span className="font-medium">{selectedCategory.categoria}</span></div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(calculation.labor)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">Energía</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(calculation.energy)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">Depreciación</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(calculation.depreciation)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">Herramientas</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(calculation.toolingCost)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">Alquiler</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(calculation.rentCost)}</span>
                        </div>
                      </div>
                      
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-300 dark:border-blue-700 font-semibold shadow-sm">
                          <span className="text-blue-900 dark:text-blue-100">Costo directo</span>
                          <span className="text-blue-900 dark:text-blue-100">{formatCurrency(calculation.direct)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            Gastos indirectos
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[320px] text-left">
                                <div className="text-xs space-y-1">
                                  <div>
                                    Tasa GI: <span className="font-semibold">{(gi * 100).toFixed(1)}%</span>
                                  </div>
                                  <div>Base (costo directo):</div>
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between"><span>Materiales</span><span className="font-medium">{formatCurrency(materials)}</span></div>
                                    <div className="flex justify-between"><span>Mano de obra</span><span className="font-medium">{formatCurrency(calculation.labor)}</span></div>
                                    <div className="flex justify-between"><span>Energía</span><span className="font-medium">{formatCurrency(calculation.energy)}</span></div>
                                    <div className="flex justify-between"><span>Depreciación</span><span className="font-medium">{formatCurrency(calculation.depreciation)}</span></div>
                                    <div className="flex justify-between"><span>Herramientas</span><span className="font-medium">{formatCurrency(calculation.toolingCost)}</span></div>
                                    <div className="flex justify-between"><span>Alquiler</span><span className="font-medium">{formatCurrency(calculation.rentCost)}</span></div>
                                  </div>
                                  <div className="pt-1 mt-1 border-t border-white/30 flex justify-between">
                                    <span>Total directo</span>
                                    <span className="font-semibold">{formatCurrency(calculation.direct)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>GI calculado</span>
                                    <span className="font-semibold">{formatCurrency(calculation.giAmount)}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(calculation.giAmount)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-300 dark:border-blue-700 font-semibold shadow-sm">
                          <span className="text-blue-900 dark:text-blue-100">Subtotal</span>
                          <span className="text-blue-900 dark:text-blue-100">{formatCurrency(calculation.subtotal)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">Margen</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(calculation.marginAmount)}</span>
                        </div>
                      </div>
                      
                      <div className="h-px bg-gradient-to-r from-transparent via-blue-400 dark:via-blue-600 to-transparent" />
                      
                      <div className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 rounded-lg shadow-lg border-2 border-emerald-500 dark:border-emerald-600">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-white text-base">Total</span>
                          <span className="font-bold text-2xl text-white drop-shadow-sm">{formatCurrency(calculation.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-emerald-100">
                          <span>Precio unitario</span>
                          <span className="font-semibold">{formatCurrency(calculation.unitPrice)}</span>
                        </div>
                        
                        {/* Indicador de moneda y conversión */}
                        <div className="mt-3 pt-3 border-t border-emerald-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-emerald-100">Moneda del sistema:</span>
                            <Badge variant="outline" className="text-white border-emerald-400 bg-emerald-500/20">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {currency}
                            </Badge>
                          </div>
                          
                          {/* Información adicional de conversión */}
                          {currency === "USD" && (
                            <div className="text-xs text-center text-emerald-100">
                              Tasa de cambio: 1 USD = {Number(params.usdRate || 3.5).toFixed(2)} PEN
                            </div>
                          )}
                          
                          {currency === "PEN" && (
                            <div className="text-xs text-center text-emerald-100">
                              Tasa de cambio: 1 USD = {Number(params.usdRate || 3.5).toFixed(2)} PEN
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 -mx-6 -mb-6 px-6 pb-6 mt-6">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={pending}
            className="h-11 px-6 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={pending}
            className="h-11 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear cotización
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
