"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, PlusCircle } from "lucide-react";

type MachineData = {
  id?: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  estado: "ACTIVA" | "MANTENIMIENTO" | "BAJA";
  ubicacion?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  serie?: string | null;
  capacidad?: string | null;
  notas?: string | null;
};

interface MachineFormProps {
  machine?: Partial<MachineData>;
  onSave: (data: FormData) => Promise<{ ok: boolean; message?: string }>;
  onCancel: () => void;
  isOpen: boolean;
}

export function MachineForm({ machine, onSave, onCancel, isOpen }: MachineFormProps) {
  const [formData, setFormData] = useState<Partial<MachineData>>(machine || { estado: "ACTIVA" });
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizar cuando cambia la máquina o se abre el modal
  useEffect(() => {
    setFormData(machine && Object.keys(machine).length ? machine : { estado: "ACTIVA" });
  }, [machine, isOpen]);

  if (!isOpen) return null;

  const buildFD = () => {
    const fd = new FormData();
    if (formData.id) fd.set("id", formData.id);
    fd.set("codigo", formData.codigo || "");
    fd.set("nombre", formData.nombre || "");
    if (formData.categoria) fd.set("categoria", formData.categoria);
    fd.set("estado", formData.estado || "ACTIVA");
    if (formData.ubicacion) fd.set("ubicacion", formData.ubicacion);
    if (formData.fabricante) fd.set("fabricante", formData.fabricante);
    if (formData.modelo) fd.set("modelo", formData.modelo);
    if (formData.serie) fd.set("serie", formData.serie);
    if (formData.capacidad) fd.set("capacidad", formData.capacidad);
    if (formData.notas) fd.set("notas", formData.notas);
    return fd;
  };

  const save = async (closeAfter: boolean) => {
    setIsLoading(true);
    try {
      await onSave(buildFD());
      if (closeAfter) {
        onCancel();
      } else {
        // Guardar y agregar otra: resetea campos y deja abierto
        setFormData({ estado: "ACTIVA" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{formData?.id ? "Editar máquina" : "Nueva máquina"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo || ""}
                  onChange={(e) => setFormData(f => ({ ...f, codigo: e.target.value }))}
                  placeholder="Ej: MAQ-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre || ""}
                  onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Torno CNC"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Input
                  id="categoria"
                  value={formData.categoria || ""}
                  onChange={(e) => setFormData(f => ({ ...f, categoria: e.target.value }))}
                  placeholder="Ej: Maquinado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado || "ACTIVA"}
                  onValueChange={(value: "ACTIVA" | "MANTENIMIENTO" | "BAJA") => setFormData(f => ({ ...f, estado: value }))}
                >
                  <SelectTrigger id="estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVA">Activa</SelectItem>
                    <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                    <SelectItem value="BAJA">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Input
                id="ubicacion"
                value={formData.ubicacion || ""}
                onChange={(e) => setFormData(f => ({ ...f, ubicacion: e.target.value }))}
                placeholder="Ej: Planta A - Sector 1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fabricante">Fabricante</Label>
                <Input
                  id="fabricante"
                  value={formData.fabricante || ""}
                  onChange={(e) => setFormData(f => ({ ...f, fabricante: e.target.value }))}
                  placeholder="Ej: Siemens"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo || ""}
                  onChange={(e) => setFormData(f => ({ ...f, modelo: e.target.value }))}
                  placeholder="Ej: CNC-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serie">Serie</Label>
                <Input
                  id="serie"
                  value={formData.serie || ""}
                  onChange={(e) => setFormData(f => ({ ...f, serie: e.target.value }))}
                  placeholder="Ej: 2024001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacidad">Capacidad</Label>
              <Input
                id="capacidad"
                value={formData.capacidad || ""}
                onChange={(e) => setFormData(f => ({ ...f, capacidad: e.target.value }))}
                placeholder="Ej: 1000 kg/h"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas || ""}
                onChange={(e) => setFormData(f => ({ ...f, notas: e.target.value }))}
                placeholder="Información adicional sobre la máquina..."
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="button" onClick={()=>save(false)} disabled={isLoading}>
                {isLoading ? "Guardando..." : (<><PlusCircle className="h-4 w-4 mr-2" />Guardar y agregar otra</>)}
              </Button>
              <Button type="button" onClick={()=>save(true)} disabled={isLoading}>
                {isLoading ? "Guardando..." : (<><Save className="h-4 w-4 mr-2" />Guardar</>)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
