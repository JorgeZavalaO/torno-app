"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@/components/ui/separator";
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
  DollarSign
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuoteLinesEditor, PiezaLine, MaterialLine } from "./quote-lines-editor";
import { getTiposTrabajo } from "@/app/(protected)/cotizador/actions";

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
  const [forceMaterials, setForceMaterials] = useState<boolean>(false);
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
    const energy = kwhRate * hours; // Cambiado: ahora es por hora de operación
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
    setMachineCategory(""); // Reset categoría
    // kwh eliminado
    setNotes("");
    setPedidoReferencia("");
    setTipoTrabajoId("");
    setTipoTrabajoSubcategoriaId("");
    setPiezasLines([]);
    setMaterialesLines([]);
    // Mantener la fecha de vigencia
  };

  const handleSubmit = () => {
    if (!clienteId) return toast.error("Selecciona un cliente");
    if (qty < 1) return toast.error("La cantidad mínima es 1");

  const formData = new FormData();
    formData.set("clienteId", clienteId);
  formData.set("qty", String(qty));
  formData.set("materials", String(materials));
    formData.set("hours", String(hours));
    if (machineCategory) formData.set("machineCategory", machineCategory); // Categoría de máquina
    // kwh removed - obsolete field, energy cost now based on hours
  formData.set("forceMaterials", String(Boolean(forceMaterials)));
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
  <DialogContent className="max-w-[2400px] max-h-[95vh] w-[98vw] min-w-[75vw] sm:w-[1800px] xl:w-[2000px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Nueva cotización
          </DialogTitle>
          <DialogDescription>
            Completa los datos para generar una nueva cotización
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="production" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Producción
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Detalles
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas
              </TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contenido principal por pestañas */}
              <div className="lg:col-span-2 space-y-6">
                
                <TabsContent value="general" className="mt-0">
                  <Card className="p-6 space-y-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Información General</h3>
                        <p className="text-sm text-muted-foreground">Datos básicos de la cotización</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="cliente" className="text-sm font-medium flex items-center gap-2">
                          Cliente
                          <Badge variant="destructive" className="text-xs">Requerido</Badge>
                        </Label>
                        <Select value={clienteId} onValueChange={setClienteId} disabled={pending}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Seleccionar cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex flex-col items-start py-1">
                                  <div className="font-medium">{client.nombre}</div>
                                  <div className="text-sm text-muted-foreground">
                                    RUC: {client.ruc}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!clienteId && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Selecciona un cliente para continuar
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="machineCategory" className="text-sm font-medium flex items-center gap-2">
                          Categoría de Máquina
                          {machineCategory && selectedCategory && (
                            <Badge variant="outline" className="text-xs">
                              Labor: ${selectedCategory.laborCost}/h | Depr: ${selectedCategory.deprPerHour}/h
                            </Badge>
                          )}
                        </Label>
                        <Select value={machineCategory} onValueChange={setMachineCategory} disabled={pending}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Seleccionar categoría..." />
                          </SelectTrigger>
                          <SelectContent>
                            {machineCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.categoria}>
                                <div className="flex flex-col items-start py-1">
                                  <div className="font-medium">{cat.categoria}</div>
                                  <div className="text-sm text-muted-foreground">
                                    MO: ${cat.laborCost}/h • Depr: ${cat.deprPerHour}/h
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Selecciona el tipo de máquina para costos específicos
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pedidoReferencia" className="text-sm font-medium">Pedido de Referencia</Label>
                        <Input
                          id="pedidoReferencia"
                          type="text"
                          placeholder="Número de pedido ERP..."
                          value={pedidoReferencia}
                          onChange={(e) => setPedidoReferencia(e.target.value)}
                          disabled={pending}
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          Referencia del pedido en el sistema ERP (opcional)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tipoTrabajo" className="text-sm font-medium">Tipo de Trabajo</Label>
                        <Select value={tipoTrabajoId} onValueChange={setTipoTrabajoId} disabled={pending}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Seleccionar tipo de trabajo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposTrabajo?.principales.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                <div className="flex flex-col items-start py-1">
                                  <div className="font-medium">{tipo.nombre}</div>
                                  {tipo.descripcion && (
                                    <div className="text-sm text-muted-foreground">
                                      {tipo.descripcion}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Tipo de trabajo para la cotización (opcional)
                        </p>
                      </div>

                      {/* Subcategoría de servicios - solo visible cuando se selecciona "Servicios" */}
                      {subcategoriasDisponibles.length > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor="tipoTrabajoSubcategoria" className="text-sm font-medium">Tipo de Servicio</Label>
                          <Select value={tipoTrabajoSubcategoriaId} onValueChange={setTipoTrabajoSubcategoriaId} disabled={pending}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Seleccionar tipo de servicio..." />
                            </SelectTrigger>
                            <SelectContent>
                              {subcategoriasDisponibles.map((subcategoria) => (
                                <SelectItem key={subcategoria.id} value={subcategoria.id}>
                                  <div className="flex flex-col items-start py-1">
                                    <div className="font-medium">{subcategoria.nombre}</div>
                                    {subcategoria.descripcion && (
                                      <div className="text-sm text-muted-foreground">
                                        {subcategoria.descripcion}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Especifica el tipo de servicio requerido
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="production" className="mt-0">
                  <Card className="p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Settings className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Parámetros de Producción</h3>
                        <p className="text-sm text-muted-foreground">Configura los recursos necesarios</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="qty" className="text-sm font-medium flex items-center justify-between">
                          <span>Cantidad (piezas)</span>
                          {piezasLines.length > 0 && (
                            <Badge variant="secondary" className="text-xs">Auto-calculado</Badge>
                          )}
                        </Label>
                        <Input
                          id="qty"
                          type="number"
                          min={1}
                          value={qty}
                          onChange={(e) => setQty(Number(e.target.value))}
                          disabled={pending || piezasLines.length > 0}
                          className="h-11"
                        />
                        {piezasLines.length > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Calculado desde líneas de detalle
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="materials" className="text-sm font-medium flex items-center justify-between">
                          <span>Materiales ({currency})</span>
                          {materialesLines.length > 0 && (
                            <Badge variant="secondary" className="text-xs">Auto-calculado</Badge>
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
                          className="h-11"
                        />
                        {materialesLines.length > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Calculado desde líneas de detalle
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hours" className="text-sm font-medium">Horas de torno</Label>
                        <Input
                          id="hours"
                          type="number"
                          step="0.01"
                          min={0}
                          value={hours}
                          onChange={(e) => setHours(Number(e.target.value))}
                          disabled={pending}
                          className="h-11"
                        />
                      </div>

                      {/* Campo kwh eliminado - el costo de energía ahora se calcula como kwhRate * hours */}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="mt-0">
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
                  <Card className="p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Observaciones</h3>
                        <p className="text-sm text-muted-foreground">Información adicional sobre la cotización</p>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Notas adicionales sobre la cotización, condiciones especiales, términos de entrega, etc..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={pending}
                      rows={6}
                      className="resize-none"
                    />
                  </Card>
                </TabsContent>
              </div>

              {/* Panel de cálculo - Sticky sidebar */}
              <div className="space-y-4 lg:sticky lg:top-4">
                {/* Validación general */}
                {!clienteId && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Selecciona un cliente para continuar con la cotización
                    </AlertDescription>
                  </Alert>
                )}

                <Card className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-slate-200 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Parámetros del Sistema</h3>
                        <p className="text-sm text-muted-foreground">Configuración actual</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Gastos indirectos</span>
                        <span className="font-semibold">{(gi * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Margen de ganancia</span>
                        <span className="font-semibold">{(margin * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Tarifa/hora</span>
                        <span className="font-semibold">{formatCurrency(hourlyRate)}</span>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Tarifa kWh</span>
                        <span className="font-semibold">{formatCurrency(kwhRate)}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-200 rounded-lg flex items-center justify-center">
                        <Calculator className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Desglose de Costos</h3>
                        <p className="text-sm text-muted-foreground">Cálculo en tiempo real</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Materiales con opciones de forzado */}
                      <div className="p-3 bg-white rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Materiales</span>
                            {materialesLines.length > 0 && (
                              <Badge variant="secondary" className="text-xs">Detallado</Badge>
                            )}
                            {forceMaterials && (
                              <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700">
                                Forzado
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold">{formatCurrency(materials)}</span>
                        </div>
                        {materialesLines.length > 0 && (
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={forceMaterials} 
                              onChange={(e) => setForceMaterials(e.target.checked)} 
                              disabled={pending}
                              className="rounded border-gray-300" 
                            />
                            Usar monto manual en lugar del detalle
                          </label>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Mano de obra</span>
                          <span className="font-medium">{formatCurrency(calculation.labor)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Energía</span>
                          <span className="font-medium">{formatCurrency(calculation.energy)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Depreciación</span>
                          <span className="font-medium">{formatCurrency(calculation.depreciation)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Herramientas</span>
                          <span className="font-medium">{formatCurrency(calculation.toolingCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Alquiler</span>
                          <span className="font-medium">{formatCurrency(calculation.rentCost)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between font-medium">
                          <span>Costo directo</span>
                          <span>{formatCurrency(calculation.direct)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gastos indirectos</span>
                          <span>{formatCurrency(calculation.giAmount)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Subtotal</span>
                          <span>{formatCurrency(calculation.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Margen</span>
                          <span>{formatCurrency(calculation.marginAmount)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-green-800">Total</span>
                          <span className="font-bold text-lg text-green-800">{formatCurrency(calculation.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Precio unitario</span>
                          <span className="font-medium">{formatCurrency(calculation.unitPrice)}</span>
                        </div>
                        
                        {/* Indicador de moneda y conversión */}
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Moneda del sistema:</span>
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {currency}
                            </Badge>
                          </div>
                          
                          {/* Información adicional de conversión */}
                          {currency === "USD" && (
                            <div className="text-xs text-center text-muted-foreground">
                              Tasa de cambio: 1 USD = {Number(params.usdRate || 3.5).toFixed(2)} PEN
                            </div>
                          )}
                          
                          {currency === "PEN" && (
                            <div className="text-xs text-center text-muted-foreground">
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
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
