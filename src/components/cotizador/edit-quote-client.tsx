"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { QuoteStatusBadge } from "./quote-status-badge";
import Link from "next/link";
import { QuoteLinesEditor, PiezaLine, MaterialLine } from "./quote-lines-editor";
import { getTiposTrabajo } from "@/app/(protected)/cotizador/actions";

type Client = { id: string; nombre: string; ruc: string };
type CostingParams = Record<string, string | number>;
type UpdateQuoteAction = (quoteId: string, fd: FormData) => Promise<{ ok: boolean; message?: string }>;

type TipoTrabajo = { id: string; nombre: string; descripcion: string | null; propiedades?: unknown; codigo: string };
type TiposTrabajoResponse = {
  principales: TipoTrabajo[];
  subcategorias: TipoTrabajo[];
};

type QuoteDetail = {
  id: string;
  createdAt: Date;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  currency: string;
  clienteId: string;
  qty: number;
  materials: unknown;
  hours: unknown;
  kwh: unknown;
  validUntil?: Date | null;
  notes?: string | null;
  pedidoReferencia?: string | null;
  tipoTrabajoId?: string | null;
  tipoTrabajo?: {
    id: string;
    nombre: string;
    descripcion: string | null;
  } | null;
  cliente: {
    id: string;
    nombre: string;
    ruc: string;
  };
};

interface EditQuoteClientProps {
  quote: QuoteDetail;
  clients: Client[];
  params: CostingParams;
  action: UpdateQuoteAction;
}

export function EditQuoteClient({ quote, clients, params, action }: EditQuoteClientProps) {
  const currency = String(params.currency || "PEN");
  const [clienteId, setClienteId] = useState<string>(quote.clienteId);
  const [qty, setQty] = useState<number>(quote.qty);
  const [materials, setMaterials] = useState<number>(Number(quote.materials) || 0);
  const [hours, setHours] = useState<number>(Number(quote.hours) || 0);
  const [kwh, setKwh] = useState<number>(Number(quote.kwh) || 0);
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>(quote.notes || "");
  const [pedidoReferencia, setPedidoReferencia] = useState<string>(quote.pedidoReferencia || "");
  const [tipoTrabajoId, setTipoTrabajoId] = useState<string>(quote.tipoTrabajoId || "");
  const [tipoTrabajoSubcategoriaId, setTipoTrabajoSubcategoriaId] = useState<string>("");
  const [tiposTrabajo, setTiposTrabajo] = useState<TiposTrabajoResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [piezasLines, setPiezasLines] = useState<PiezaLine[]>([]);
  const [materialesLines, setMaterialesLines] = useState<MaterialLine[]>([]);
  const [forceMaterials, setForceMaterials] = useState<boolean>(false);
  // Bandera para saber si qty/materials fueron derivados de líneas y así bloquear edición manual
  const [derivedQty, setDerivedQty] = useState(false);
  const [derivedMaterials, setDerivedMaterials] = useState(false);

  const gi = Number(params.gi ?? 0);
  const margin = Number(params.margin ?? 0);
  const hourlyRate = Number(params.hourlyRate ?? 0);
  const kwhRate = Number(params.kwhRate ?? 0);
  const depr = Number(params.deprPerHour ?? 0);
  const tooling = Number(params.toolingPerPiece ?? 0);
  const rent = Number(params.rentPerHour ?? 0);

  const calculation = useMemo(() => {
    const labor = hourlyRate * hours;
    const energy = kwhRate * kwh;
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
  }, [materials, hours, kwh, qty, gi, margin, hourlyRate, kwhRate, depr, tooling, rent]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency 
    }).format(amount);

  const formatDate = (date: Date) =>
    date.toISOString().slice(0, 10);

  const handleSubmit = () => {
    if (!clienteId) return toast.error("Selecciona un cliente");
    if (qty < 1) return toast.error("La cantidad mínima es 1");

    const formData = new FormData();
    formData.set("clienteId", clienteId);
  formData.set("qty", String(qty));
  formData.set("materials", String(materials));
    formData.set("hours", String(hours));
    formData.set("kwh", String(kwh));
  formData.set("forceMaterials", String(forceMaterials));
    if (validUntil) formData.set("validUntil", validUntil);
    if (notes) formData.set("notes", notes);
    if (pedidoReferencia) formData.set("pedidoReferencia", pedidoReferencia);
    if (tipoTrabajoSubcategoriaId) formData.set("tipoTrabajoId", tipoTrabajoSubcategoriaId);
    else if (tipoTrabajoId) formData.set("tipoTrabajoId", tipoTrabajoId);
  if (piezasLines.length) formData.set("piezas", JSON.stringify(piezasLines));
  if (materialesLines.length) formData.set("materialesDetalle", JSON.stringify(materialesLines));

    startTransition(async () => {
      const result = await action(quote.id, formData);
      if (result.ok) {
        toast.success("Cotización actualizada exitosamente");
        router.refresh();
        window.location.href = `/cotizador/${quote.id}`;
      } else {
        toast.error(result.message ?? "Error al actualizar la cotización");
      }
    });
  };

  const canEdit = quote.status !== "APPROVED";

  // Pre-cargar líneas desde breakdown si existen
  useEffect(() => {
    type BreakdownShape = {
      inputs?: {
        piezasLines?: Array<{ productoId?: string; descripcion?: string; qty?: number }>;
        materialesLines?: Array<{ productoId?: string; descripcion?: string; qty?: number; unitCost?: number }>;
      };
    } | null | undefined;

    const rawBreak = (quote as unknown as { breakdown?: unknown }).breakdown as BreakdownShape;
    const inputs = rawBreak?.inputs;
    if (inputs?.piezasLines && Array.isArray(inputs.piezasLines) && inputs.piezasLines.length) {
      const lines: PiezaLine[] = inputs.piezasLines.map(p => ({
        productoId: p.productoId || undefined,
        descripcion: p.descripcion || '',
        qty: Number(p.qty || 0) || 0,
      })).filter((line: PiezaLine) => !!(line.descripcion || line.productoId));
      if (lines.length) {
        setPiezasLines(lines);
        const qSum = lines.reduce((s,l)=> s + (l.qty||0), 0);
        setQty(qSum);
        setDerivedQty(true);
      }
    }
    if (inputs?.materialesLines && Array.isArray(inputs.materialesLines) && inputs.materialesLines.length) {
      const mLines: MaterialLine[] = inputs.materialesLines.map(m => ({
        productoId: m.productoId || undefined,
        descripcion: m.descripcion || '',
        qty: Number(m.qty || 0) || 0,
        unitCost: Number(m.unitCost || 0) || 0,
      })).filter((line: MaterialLine) => !!(line.descripcion || line.productoId));
      if (mLines.length) {
        setMaterialesLines(mLines);
        const mSum = Number(mLines.reduce((s,l)=> s + (l.qty * l.unitCost), 0).toFixed(2));
        setMaterials(mSum);
        setDerivedMaterials(true);
      }
    }
    if (quote.validUntil) setValidUntil(formatDate(quote.validUntil));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id]);

  // Limpiar subcategoría cuando cambia el tipo principal
  useEffect(() => {
    if (tipoTrabajoId && tiposTrabajo) {
      const tipoSeleccionado = tiposTrabajo.principales.find(t => t.id === tipoTrabajoId);
      if (tipoSeleccionado?.codigo !== "SERVICIOS") {
        setTipoTrabajoSubcategoriaId("");
      }
    }
  }, [tipoTrabajoId, tiposTrabajo]);

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

  // Cargar tipos de trabajo
  useEffect(() => {
    startTransition(async () => {
      try {
        const tipos = await getTiposTrabajo();
        setTiposTrabajo(tipos as TiposTrabajoResponse);
      } catch (error) {
        console.error("Error loading tipos de trabajo:", error);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/cotizador/${quote.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Editar Cotización #{quote.id.slice(0, 8)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <QuoteStatusBadge status={quote.status} />
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                Cliente: {quote.cliente.nombre}
              </span>
            </div>
          </div>
        </div>
        {canEdit && (
          <Button onClick={handleSubmit} disabled={pending} size="lg">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
        )}
      </div>

      {/* Advertencia si no se puede editar */}
      {!canEdit && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <div className="font-medium">Cotización no editable</div>
              <div className="text-sm text-yellow-700">
                Las cotizaciones aprobadas no pueden ser modificadas.
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Información General
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select 
                    value={clienteId} 
                    onValueChange={setClienteId} 
                    disabled={pending || !canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div>
                            <div className="font-medium">{client.nombre}</div>
                            <div className="text-sm text-muted-foreground">
                              RUC: {client.ruc}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipoTrabajo">Tipo de Trabajo</Label>
                      <Select 
                        value={tipoTrabajoId} 
                        onValueChange={setTipoTrabajoId} 
                        disabled={pending || !canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de trabajo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposTrabajo?.principales.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              <div>
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
                        <Label htmlFor="tipoTrabajoSubcategoria">Tipo de Servicio</Label>
                        <Select 
                          value={tipoTrabajoSubcategoriaId} 
                          onValueChange={setTipoTrabajoSubcategoriaId} 
                          disabled={pending || !canEdit}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo de servicio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {subcategoriasDisponibles.map((subcategoria) => (
                              <SelectItem key={subcategoria.id} value={subcategoria.id}>
                                <div>
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

                    <div className="space-y-2">
                      <Label htmlFor="pedidoReferencia">Pedido de Referencia</Label>
                      <Input
                        id="pedidoReferencia"
                        type="text"
                        placeholder="Número de pedido ERP..."
                        value={pedidoReferencia}
                        onChange={(e) => setPedidoReferencia(e.target.value)}
                        disabled={pending || !canEdit}
                      />
                      <p className="text-xs text-muted-foreground">
                        Referencia del pedido en el sistema ERP (opcional)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Vigente hasta</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        disabled={pending || !canEdit}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-6">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Parámetros de Producción
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qty">Cantidad (piezas) *</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    disabled={pending || !canEdit || derivedQty}
                  />
                  {derivedQty && <p className="text-xs text-muted-foreground">Cantidad calculada automáticamente desde líneas de piezas.</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="materials">Materiales ({currency})</Label>
                  <Input
                    id="materials"
                    type="number"
                    step="0.01"
                    min={0}
                    value={materials}
                    onChange={(e) => setMaterials(Number(e.target.value))}
                    disabled={pending || !canEdit || derivedMaterials}
                  />
                  {derivedMaterials && <p className="text-xs text-muted-foreground">Costo de materiales total calculado desde líneas de materiales.</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours">Horas de torno</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.01"
                    min={0}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    disabled={pending || !canEdit}
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="kwh">Consumo energético (kWh)</Label>
                  <Input
                    id="kwh"
                    type="number"
                    step="0.01"
                    min={0}
                    value={kwh}
                    onChange={(e) => setKwh(Number(e.target.value))}
                    disabled={pending || !canEdit}
                  />
                </div>
              </div>
            </div>
          </Card>

          <QuoteLinesEditor
            piezasLines={piezasLines}
            setPiezasLines={setPiezasLines}
            materialesLines={materialesLines}
            setMaterialesLines={setMaterialesLines}
            currency={currency}
            disabled={pending || !canEdit}
          />

          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Observaciones
              </h3>
              <Textarea
                placeholder="Notas adicionales sobre la cotización..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={pending || !canEdit}
                rows={4}
              />
            </div>
          </Card>
        </div>

        {/* Panel de cálculo */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Parámetros del Sistema
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gastos indirectos:</span>
                  <span className="font-medium">{(gi * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Margen de ganancia:</span>
                  <span className="font-medium">{(margin * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarifa por hora:</span>
                  <span className="font-medium">{formatCurrency(hourlyRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarifa kWh:</span>
                  <span className="font-medium">{formatCurrency(kwhRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Depreciación/hora:</span>
                  <span className="font-medium">{formatCurrency(depr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Herramientas/pieza:</span>
                  <span className="font-medium">{formatCurrency(tooling)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alquiler/hora:</span>
                  <span className="font-medium">{formatCurrency(rent)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Desglose de Costos
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span>Materiales</span>
                    {forceMaterials && (
                      <span title="Forzar materiales activo: se usará el monto manual" className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Forzar</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{formatCurrency(materials)}</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={forceMaterials} onChange={(e) => setForceMaterials(e.target.checked)} disabled={pending || !canEdit} />
                      Forzar materiales
                    </label>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Mano de obra</span>
                  <span>{formatCurrency(calculation.labor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Energía</span>
                  <span>{formatCurrency(calculation.energy)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Depreciación</span>
                  <span>{formatCurrency(calculation.depreciation)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Herramientas</span>
                  <span>{formatCurrency(calculation.toolingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alquiler</span>
                  <span>{formatCurrency(calculation.rentCost)}</span>
                </div>
                
                <Separator className="my-2" />
                
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
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(calculation.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Precio unitario</span>
                  <span>{formatCurrency(calculation.unitPrice)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
