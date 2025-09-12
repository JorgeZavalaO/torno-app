"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Clock, Wrench, Save } from "lucide-react";

interface OT {
  id: string;
  codigo: string;
}

interface QuickActionsCardProps {
  machineId: string;
  ots: OT[];
  onLogHours: (data: FormData) => Promise<void>;
  onScheduleMaintenance: (data: FormData) => Promise<void>;
  maintenanceOptions?: { value: string; label: string }[];
}

export function QuickActionsCard({ machineId, ots, onLogHours, onScheduleMaintenance, maintenanceOptions }: QuickActionsCardProps) {
  const router = useRouter();
  // Estados para registro de horas
  const [selectedOT, setSelectedOT] = useState(ots[0]?.id || "");
  const [hours, setHours] = useState(1);
  const [hoursNote, setHoursNote] = useState("");
  const [isLoggingHours, setIsLoggingHours] = useState(false);

  // Estados para programar mantenimiento
  const [maintenanceType, setMaintenanceType] = useState("PREVENTIVO");
  const [maintenanceDate, setMaintenanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isSchedulingMaintenance, setIsSchedulingMaintenance] = useState(false);

  const handleLogHours = async () => {
    setIsLoggingHours(true);
    try {
      const fd = new FormData();
      fd.set("maquinaId", machineId);
      fd.set("tipo", "USO");
      fd.set("otId", selectedOT);
      fd.set("horas", String(hours));
      if (hoursNote.trim()) fd.set("nota", hoursNote.trim());
      
      await onLogHours(fd);
  setHours(1);
  setHoursNote("");
  startTransition(() => router.refresh());
    } finally {
      setIsLoggingHours(false);
    }
  };

  const handleScheduleMaintenance = async () => {
    setIsSchedulingMaintenance(true);
    try {
      const fd = new FormData();
      fd.set("maquinaId", machineId);
      fd.set("tipo", maintenanceType);
      fd.set("fechaProg", new Date(maintenanceDate).toISOString());
      
  await onScheduleMaintenance(fd);
  startTransition(() => router.refresh());
    } finally {
      setIsSchedulingMaintenance(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registrar horas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Registrar horas de uso</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ot-select">Orden de trabajo</Label>
              <Select value={selectedOT} onValueChange={setSelectedOT}>
                <SelectTrigger id="ot-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ots.map(ot => (
                    <SelectItem key={ot.id} value={ot.id}>
                      {ot.codigo}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours-note">Nota (opcional)</Label>
            <Input
              id="hours-note"
              value={hoursNote}
              onChange={(e) => setHoursNote(e.target.value)}
              placeholder="Descripción de la operación realizada..."
            />
          </div>

          <Button 
            onClick={handleLogHours} 
            disabled={isLoggingHours || !selectedOT}
            className="w-full"
          >
            {isLoggingHours ? (
              "Registrando..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Registrar horas
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Programar mantenimiento */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="font-medium">Programar mantenimiento</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance-type">Tipo de mantenimiento</Label>
              <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                <SelectTrigger id="maintenance-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceOptions && maintenanceOptions.length > 0 ? (
                    maintenanceOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                      <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
                      <SelectItem value="PREDICTIVO">Predictivo</SelectItem>
                      <SelectItem value="EMERGENCIA">Emergencia</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-date">Fecha programada</Label>
              <Input
                id="maintenance-date"
                type="date"
                value={maintenanceDate}
                onChange={(e) => setMaintenanceDate(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleScheduleMaintenance}
            disabled={isSchedulingMaintenance}
            className="w-full"
            variant="outline"
          >
            {isSchedulingMaintenance ? (
              "Programando..."
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Programar mantenimiento
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}