
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string;
  nombreProducto: string;
  vidaUtilEstimada?: number | null;
  onSuccess: (msg: string) => void;
  actions: {
    createToolInstance: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  };
};

export function CreateToolInstanceDialog({
  open,
  onOpenChange,
  sku,
  nombreProducto,
  vidaUtilEstimada,
  onSuccess,
  actions,
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState<"NUEVA" | "AFILADO">("NUEVA");
  const [ubicacion, setUbicacion] = useState("Almacén");
  const [costo, setCosto] = useState("");
  const [vidaUtil, setVidaUtil] = useState(vidaUtilEstimada ? String(vidaUtilEstimada) : "");

  async function handleSubmit() {
    if (!codigo || !costo) {
      toast.error("Código y costo son requeridos");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    fd.append("productoId", sku);
    fd.append("codigo", codigo);
    fd.append("estado", estado);
    fd.append("ubicacion", ubicacion || "Almacén");
    fd.append("costoInicial", costo);
    if (vidaUtil) fd.append("vidaUtilEstimada", vidaUtil);

    const res = await actions.createToolInstance(fd);
    setIsPending(false);

    if (res.ok) {
      onSuccess(res.message || "Herramienta creada");
      onOpenChange(false);
      setCodigo("");
      setEstado("NUEVA");
      setUbicacion("Almacén");
      setCosto("");
      setVidaUtil(vidaUtilEstimada ? String(vidaUtilEstimada) : "");
    } else {
      toast.error(res.message || "Error al crear");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Instancia de Herramienta</DialogTitle>
          <DialogDescription>
            Registra una nueva unidad de <strong>{nombreProducto}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código/Serial *</Label>
            <Input
              id="codigo"
              placeholder="ej. QR-001, SERIAL-ABC123"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Identificador único para esta herramienta (puede ser QR, serie, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as "NUEVA" | "AFILADO")}>
              <SelectTrigger id="estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NUEVA">Nueva</SelectItem>
                <SelectItem value="AFILADO">Afilada</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecciona el estado actual de la herramienta
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación</Label>
            <Input
              id="ubicacion"
              placeholder="ej. Almacén, Torno 1, etc."
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costo">Costo Inicial *</Label>
            <Input
              id="costo"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              disabled={isPending}
            />
          </div>

          {vidaUtilEstimada && (
            <div className="space-y-2">
              <Label htmlFor="vidaUtil">Vida Útil (opcional)</Label>
              <Input
                id="vidaUtil"
                type="number"
                min="0"
                step="0.1"
                placeholder={vidaUtilEstimada?.toString()}
                value={vidaUtil}
                onChange={(e) => setVidaUtil(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Valor sugerido: {vidaUtilEstimada}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !codigo || !costo}>
            {isPending ? "Creando..." : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
