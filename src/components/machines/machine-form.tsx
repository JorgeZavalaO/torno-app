"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Settings, MapPin, Factory, Wrench, Hash, Info, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  statusOptions?: { value: string; label: string }[];
}

export function MachineForm({ machine, onSave, onCancel, isOpen, statusOptions }: MachineFormProps) {
  const [formData, setFormData] = useState<Partial<MachineData>>(machine || { estado: "ACTIVA" });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sincronizar cuando cambia la máquina o se abre el modal
  useEffect(() => {
    setFormData(machine && Object.keys(machine).length ? machine : { estado: "ACTIVA" });
    setErrors({}); // Limpiar errores al abrir/cambiar máquina
  }, [machine, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.codigo?.trim()) {
      newErrors.codigo = "El código es requerido";
    }
    
    if (!formData.nombre?.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "ACTIVA": return "bg-green-100 text-green-800 border-green-200";
      case "MANTENIMIENTO": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "BAJA": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "ACTIVA": return "🟢";
      case "MANTENIMIENTO": return "🟡";
      case "BAJA": return "🔴";
      default: return "⚪";
    }
  };

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
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await onSave(buildFD());
      if (result.ok) {
        if (closeAfter) {
          onCancel();
        } else {
          // Guardar y agregar otra: resetea campos y deja abierto
          setFormData({ estado: "ACTIVA" });
          setErrors({});
        }
      }
    } catch (error) {
      console.error("Error saving machine:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="p-0 max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Hidden dialog title for Radix accessibility */}
          <DialogHeader className="sr-only">
            <DialogTitle>{formData?.id ? "Editar máquina" : "Nueva máquina"}</DialogTitle>
          </DialogHeader>
          
          <div className="w-full">
            {/* Header moderno sin Card */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg shadow-sm">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {formData?.id ? "Editar máquina" : "Nueva máquina"}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {formData?.id ? "Actualiza la información de la máquina" : "Registra una nueva máquina en el sistema"}
                  </p>
                </div>
              </div>
              {formData.estado && (
                <div className={`px-3 py-1 rounded-full text-xs font-medium border shadow-sm ${getStatusColor(formData.estado)}`}>
                  {getStatusIcon(formData.estado)} {formData.estado}
                </div>
              )}
            </div>
            
            {/* Contenido del formulario */}
            <div className="px-6 py-6 max-h-[65vh] overflow-y-auto">
              <div className="space-y-8">
                {/* Información Básica */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
                    <Hash className="h-4 w-4 text-blue-600" />
                    Información básica
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="codigo" className="text-sm font-medium flex items-center gap-1">
                        Código <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="codigo"
                        value={formData.codigo || ""}
                        onChange={(e) => {
                          setFormData(f => ({ ...f, codigo: e.target.value }));
                          if (errors.codigo) {
                            setErrors(prev => ({ ...prev, codigo: "" }));
                          }
                        }}
                        placeholder="Ej: MAQ-001"
                        className={`transition-colors ${errors.codigo ? "border-red-500 focus:border-red-500" : "focus:border-blue-500"}`}
                        required
                      />
                      {errors.codigo && (
                        <p className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.codigo}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="text-sm font-medium flex items-center gap-1">
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="nombre"
                        value={formData.nombre || ""}
                        onChange={(e) => {
                          setFormData(f => ({ ...f, nombre: e.target.value }));
                          if (errors.nombre) {
                            setErrors(prev => ({ ...prev, nombre: "" }));
                          }
                        }}
                        placeholder="Ej: Torno CNC Industrial"
                        className={`transition-colors ${errors.nombre ? "border-red-500 focus:border-red-500" : "focus:border-blue-500"}`}
                        required
                      />
                      {errors.nombre && (
                        <p className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.nombre}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="categoria" className="text-sm font-medium">Categoría</Label>
                      <Input
                        id="categoria"
                        value={formData.categoria || ""}
                        onChange={(e) => setFormData(f => ({ ...f, categoria: e.target.value }))}
                        placeholder="Ej: Maquinado, Soldadura, Pintura..."
                        className="focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="estado" className="text-sm font-medium">Estado</Label>
                      <Select
                        value={formData.estado || "ACTIVA"}
                        onValueChange={(value: "ACTIVA" | "MANTENIMIENTO" | "BAJA") => setFormData(f => ({ ...f, estado: value }))}
                      >
                        <SelectTrigger id="estado" className="focus:border-blue-500 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions && statusOptions.length > 0 ? (
                            statusOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-2">
                                  {getStatusIcon(opt.value)} {opt.label}
                                </span>
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="ACTIVA">
                                <span className="flex items-center gap-2">🟢 Activa</span>
                              </SelectItem>
                              <SelectItem value="MANTENIMIENTO">
                                <span className="flex items-center gap-2">🟡 Mantenimiento</span>
                              </SelectItem>
                              <SelectItem value="BAJA">
                                <span className="flex items-center gap-2">🔴 Baja</span>
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Ubicación y Detalles */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Ubicación y detalles
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ubicacion" className="text-sm font-medium">Ubicación</Label>
                    <Input
                      id="ubicacion"
                      value={formData.ubicacion || ""}
                      onChange={(e) => setFormData(f => ({ ...f, ubicacion: e.target.value }))}
                      placeholder="Ej: Planta A - Sector 1 - Línea 3"
                      className="focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fabricante" className="text-sm font-medium flex items-center gap-1">
                        <Factory className="h-3 w-3" />
                        Fabricante
                      </Label>
                      <Input
                        id="fabricante"
                        value={formData.fabricante || ""}
                        onChange={(e) => setFormData(f => ({ ...f, fabricante: e.target.value }))}
                        placeholder="Ej: Siemens, Haas..."
                        className="focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="modelo" className="text-sm font-medium">Modelo</Label>
                      <Input
                        id="modelo"
                        value={formData.modelo || ""}
                        onChange={(e) => setFormData(f => ({ ...f, modelo: e.target.value }))}
                        placeholder="Ej: CNC-500X"
                        className="focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="serie" className="text-sm font-medium">Número de serie</Label>
                      <Input
                        id="serie"
                        value={formData.serie || ""}
                        onChange={(e) => setFormData(f => ({ ...f, serie: e.target.value }))}
                        placeholder="Ej: SN2024001"
                        className="focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacidad" className="text-sm font-medium flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      Capacidad / Especificaciones técnicas
                    </Label>
                    <Input
                      id="capacidad"
                      value={formData.capacidad || ""}
                      onChange={(e) => setFormData(f => ({ ...f, capacidad: e.target.value }))}
                      placeholder="Ej: 1000 kg/h, 50 HP, Ø300mm max..."
                      className="focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Información Adicional */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
                    <Info className="h-4 w-4 text-blue-600" />
                    Información adicional
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notas" className="text-sm font-medium">Notas y observaciones</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas || ""}
                      onChange={(e) => setFormData(f => ({ ...f, notas: e.target.value }))}
                      placeholder="Información adicional, observaciones, historial de mantenimiento, etc..."
                      rows={4}
                      className="resize-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer con acciones simplificadas */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <AlertCircle className="h-3 w-3" />
                <span><span className="text-red-500">*</span> Campos requeridos</span>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel} 
                  disabled={isLoading}
                  className="min-w-[100px]"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={() => save(true)} 
                  disabled={isLoading}
                  className="min-w-[100px] bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
