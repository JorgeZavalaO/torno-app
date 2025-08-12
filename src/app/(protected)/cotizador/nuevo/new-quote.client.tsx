"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

type Client = { id: string; nombre: string; ruc: string };
type Params = Record<string, string | number>;
type Action = (fd: FormData) => Promise<{ ok: boolean; id?: string; message?: string }>;

export default function NewQuoteClient({
  clients, params, action,
}:{
  clients: Client[];
  params: Params;
  action: Action;
}) {
  const currency = String(params.currency || "PEN");
  const [clienteId, setClienteId] = useState<string>(clients[0]?.id ?? "");
  const [qty, setQty] = useState<number>(1);
  const [materials, setMaterials] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [kwh, setKwh] = useState<number>(0);
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [pending, start] = useTransition();

  const gi = Number(params.gi ?? 0);
  const margin = Number(params.margin ?? 0);
  const hourlyRate = Number(params.hourlyRate ?? 0);
  const kwhRate = Number(params.kwhRate ?? 0);
  const depr = Number(params.deprPerHour ?? 0);
  const tooling = Number(params.toolingPerPiece ?? 0);
  const rent = Number(params.rentPerHour ?? 0);

  const calc = useMemo(() => {
    const labor = hourlyRate * hours;
    const energy = kwhRate * kwh;
    const dep = depr * hours;
    const tool = tooling * qty;
    const ren = rent * hours;
    const direct = materials + labor + energy + dep + tool + ren;
    const giAmount = direct * gi;
    const subtotal = direct + giAmount;
    const marginAmount = subtotal * margin;
    const total = subtotal + marginAmount;
    const unitPrice = qty > 0 ? total / qty : total;
    return { labor, energy, dep, tool, ren, direct, giAmount, subtotal, marginAmount, total, unitPrice };
  }, [materials, hours, kwh, qty, gi, margin, hourlyRate, kwhRate, depr, tooling, rent]);

  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  const onSubmit = () => {
    if (!clienteId) return toast.error("Selecciona un cliente");
    if (qty < 1) return toast.error("Cantidad mínima 1");

    const fd = new FormData();
    fd.set("clienteId", clienteId);
    fd.set("qty", String(qty));
    fd.set("materials", String(materials));
    fd.set("hours", String(hours));
    fd.set("kwh", String(kwh));
    if (validUntil) fd.set("validUntil", validUntil);
    if (notes) fd.set("notes", notes);

    start(async () => {
      const res = await action(fd);
      if (res.ok) {
        toast.success("Cotización creada");
        window.location.href = `/cotizador/${res.id}`;
      } else {
        toast.error(res.message ?? "No se pudo crear");
      }
    });
  };

  useEffect(() => {
    // default vigencia +15 días
    if (!validUntil) {
      const d = new Date(); d.setDate(d.getDate() + 15);
      setValidUntil(d.toISOString().slice(0,10));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Nueva cotización</h1>
        <Button onClick={onSubmit} disabled={pending}><Save className="h-4 w-4 mr-2" />{pending ? "Guardando..." : "Guardar"}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <Card className="p-5 space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre} — {c.ruc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Vigente hasta</Label>
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Cantidad (piezas)</Label>
              <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
            </div>

            <div className="space-y-1">
              <Label>Materiales ({currency})</Label>
              <Input type="number" step="0.01" min={0} value={materials} onChange={e => setMaterials(Number(e.target.value))} />
            </div>

            <div className="space-y-1">
              <Label>Horas de torno</Label>
              <Input type="number" step="0.01" min={0} value={hours} onChange={e => setHours(Number(e.target.value))} />
            </div>

            <div className="space-y-1">
              <Label>Consumo (kWh)</Label>
              <Input type="number" step="0.01" min={0} value={kwh} onChange={e => setKwh(Number(e.target.value))} />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Observaciones</Label>
              <Input placeholder="Opcional" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Desglose */}
        <Card className="p-5 space-y-3">
          <div className="font-medium">Parámetros</div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Gastos indirectos:</div><div className="text-right">{(gi * 100).toFixed(2)}%</div>
            <div>Margen:</div><div className="text-right">{(margin * 100).toFixed(2)}%</div>
            <div>Tarifa hora:</div><div className="text-right">{fmt(hourlyRate)}</div>
            <div>Tarifa kWh:</div><div className="text-right">{fmt(kwhRate)}</div>
            <div>Deprec./h:</div><div className="text-right">{fmt(depr)}</div>
            <div>Herr./pieza:</div><div className="text-right">{fmt(tooling)}</div>
            <div>Alquiler/h:</div><div className="text-right">{fmt(rent)}</div>
          </div>

          <div className="h-px bg-border my-2" />

          <div className="font-medium">Costos</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Materiales</div><div className="text-right">{fmt(materials)}</div>
            <div>Mano de obra</div><div className="text-right">{fmt(calc.labor)}</div>
            <div>Energía</div><div className="text-right">{fmt(calc.energy)}</div>
            <div>Depreciación</div><div className="text-right">{fmt(calc.dep)}</div>
            <div>Herramientas</div><div className="text-right">{fmt(calc.tool)}</div>
            <div>Alquiler</div><div className="text-right">{fmt(calc.ren)}</div>
            <div className="font-medium">Costo directo</div><div className="text-right font-medium">{fmt(calc.direct)}</div>
            <div>GI</div><div className="text-right">{fmt(calc.giAmount)}</div>
            <div className="font-medium">Subtotal</div><div className="text-right font-medium">{fmt(calc.subtotal)}</div>
            <div>Margen</div><div className="text-right">{fmt(calc.marginAmount)}</div>
            <div className="font-semibold">Total</div><div className="text-right font-semibold">{fmt(calc.total)}</div>
            <div className="text-muted-foreground">Precio unitario</div><div className="text-right">{fmt(calc.unitPrice)}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
