"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Save } from "lucide-react";

type Machine = {
  id: string;
  codigo: string;
  nombre: string;
};

type OT = {
  id: string;
  codigo: string;
};

interface QuickHoursFormProps {
  machines: Machine[];
  ots: OT[];
  onSubmit: (data: FormData) => Promise<void>;
}

export function QuickHoursForm({ machines, ots, onSubmit }: QuickHoursFormProps) {
  const router = useRouter();
  const [selectedMachine, setSelectedMachine] = useState(machines[0]?.id || "");
  const [selectedOT, setSelectedOT] = useState(ots[0]?.id || "");
  const [hours, setHours] = useState(1);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.set("maquinaId", selectedMachine);
      fd.set("tipo", "USO");
      fd.set("horas", String(hours));
      fd.set("otId", selectedOT);
      if (note.trim()) fd.set("nota", note.trim());
      
      await onSubmit(fd);
  setHours(1);
  setNote("");
  startTransition(() => router.refresh());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Registro rápido de horas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="machine-select">Máquina</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger id="machine-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {machines.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre} — {m.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ot-select">Orden de Trabajo</Label>
            <Select value={selectedOT} onValueChange={setSelectedOT}>
              <SelectTrigger id="ot-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ots.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours-input">Horas</Label>
            <Input
              id="hours-input"
              type="number"
              min={0.25}
              step="0.25"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-input">Nota (opcional)</Label>
            <Input
              id="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Operación realizada..."
            />
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="h-10">
            {isLoading ? (
              "Guardando..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}