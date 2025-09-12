"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign,
  Loader2,
  Shield,
  AlertTriangle,
  TrendingUp,
  Pencil
} from "lucide-react";

type Actions = {
  updateMaintenance: (fd: FormData) => Promise<{ok: boolean; message?: string}>;
};

interface MaintenanceEditDialogProps {
  id: string;
  tipo: string;
  fechaProg: string; // ISO
  costo?: number | null;
  nota?: string | null;
  actions: Actions;
  maintenanceOptions?: { value: string; label: string }[];
}

export default function MaintenanceEditDialog({ id, tipo, fechaProg, costo, nota, actions, maintenanceOptions }: MaintenanceEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipoMant, setTipoMant] = useState(tipo);
  const [fechaProgMant, setFechaProgMant] = useState(() => new Date(fechaProg).toISOString().slice(0,16));
  const [costoEstimado, setCostoEstimado] = useState(costo ? String(costo) : "");
  const [notaMant, setNotaMant] = useState(nota ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("tipo", tipoMant);
      fd.set("fechaProg", new Date(fechaProgMant).toISOString());
      fd.set("costo", costoEstimado || "0");
      if (notaMant.trim()) fd.set("nota", notaMant.trim());

      const result = await actions.updateMaintenance(fd);
      if (result.ok) {
        toast.success(result.message || "Mantenimiento actualizado");
        setOpen(false);
        startTransition(() => router.refresh());
      } else {
        toast.error(result.message || "Error al actualizar");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar mantenimiento</DialogTitle>
          <DialogDescription>Modifica los campos necesarios y guarda los cambios.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipoMant} onValueChange={setTipoMant}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceOptions && maintenanceOptions.length > 0 ? (
                    maintenanceOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="PREVENTIVO"><div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Preventivo</div></SelectItem>
                      <SelectItem value="CORRECTIVO"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Correctivo</div></SelectItem>
                      <SelectItem value="PREDICTIVO"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Predictivo</div></SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha programada</Label>
              <input type="datetime-local" value={fechaProgMant} onChange={e=>setFechaProgMant(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Costo</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="number" value={costoEstimado} onChange={e=>setCostoEstimado(e.target.value)} min="0" step="0.01" placeholder="0.00" className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notaMant} onChange={e=>setNotaMant(e.target.value)} rows={4} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando…</>) : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}