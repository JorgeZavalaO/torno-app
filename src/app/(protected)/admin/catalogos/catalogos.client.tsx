"use client";

import { useState, useTransition, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { TipoCatalogo } from "@prisma/client";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { CatalogosByTipo, CatalogoItem } from "@/app/server/services/catalogos";
// Nota: no importamos el módulo de acciones aquí para evitar que un "module object" sea
// pasado desde el servidor hacia este Client Component. En su lugar, la página servidor
// debe pasar las funciones necesarias en la prop `actions` como un objeto plano.

interface Actions {
  upsertCatalogoItem: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>;
  deleteCatalogoItem: (id: string) => Promise<{ ok: boolean; message?: string }>;
  reorderCatalogo: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  resetCatalogoTipo: (tipo: TipoCatalogo) => Promise<{ ok: boolean; message?: string }>;
}

// Mapeo de tipos a nombres amigables y organizados por categoría
const TIPO_LABELS: Record<TipoCatalogo, { label: string; category: string; description: string }> = {
  UNIDAD_MEDIDA: { label: "Unidades de Medida", category: "Productos", description: "Unidades como kg, pz, m, etc." },
  CATEGORIA_PRODUCTO: { label: "Categorías de Producto", category: "Productos", description: "Tipos de productos del inventario" },
  TIPO_MOVIMIENTO: { label: "Tipos de Movimiento", category: "Productos", description: "Tipos de movimientos de inventario" },
  
  ESTADO_OT: { label: "Estados de OT", category: "Órdenes de Trabajo", description: "Estados del flujo de órdenes" },
  PRIORIDAD_OT: { label: "Prioridades de OT", category: "Órdenes de Trabajo", description: "Niveles de prioridad" },
  TIPO_ACABADO: { label: "Tipos de Acabado", category: "Órdenes de Trabajo", description: "Acabados disponibles" },
  
  ESTADO_MAQUINA: { label: "Estados de Máquina", category: "Máquinas", description: "Estados operativos de máquinas" },
  EVENTO_MAQUINA: { label: "Eventos de Máquina", category: "Máquinas", description: "Tipos de eventos registrados" },
  CATEGORIA_MAQUINA: { label: "Categorías de Máquina", category: "Máquinas", description: "Tipos de máquinas" },
  TIPO_MANTENIMIENTO: { label: "Tipos de Mantenimiento", category: "Máquinas", description: "Tipos de mantenimiento" },
  ESTADO_MANTENIMIENTO: { label: "Estados de Mantenimiento", category: "Máquinas", description: "Estados del mantenimiento" },
  
  ESTADO_SC: { label: "Estados SC", category: "Compras", description: "Estados de solicitudes de compra" },
  ESTADO_OC: { label: "Estados OC", category: "Compras", description: "Estados de órdenes de compra" },
  
  ESTADO_COTIZACION: { label: "Estados de Cotización", category: "Cotizaciones", description: "Estados del flujo de cotizaciones" },
  TIPO_TRABAJO: { label: "Tipos de Trabajo", category: "Cotizaciones", description: "Tipos de trabajo disponibles" },
  MONEDA: { label: "Monedas", category: "Configuración", description: "Monedas disponibles" },
  TIPO_PARAMETRO: { label: "Tipos de Parámetro", category: "Configuración", description: "Tipos de parámetros del sistema" },
};

interface CatalogosClientProps {
  catalogosByTipo: CatalogosByTipo;
  canWrite: boolean;
  actions?: Partial<Actions>;
}

export function CatalogosClient({ catalogosByTipo, canWrite, actions }: CatalogosClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogoItem | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoCatalogo | null>(null);
  const [pending, startTransition] = useTransition();
  
  // Estado para controlar qué secciones están colapsadas
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    // Por defecto todas las secciones están colapsadas para ahorrar espacio
    const sections = Object.values(TipoCatalogo).reduce((acc, tipo) => {
      acc[tipo] = true; // Colapsadas por defecto
      return acc;
    }, {} as Record<string, boolean>);
    return sections;
  });

  // Función para alternar el estado de colapso de una sección
  const toggleCollapse = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };
  
  // Efecto para manejar la visibilidad del campo de tipo padre
  useEffect(() => {
    if (isDialogOpen && selectedTipo === TipoCatalogo.TIPO_TRABAJO) {
      const isSubcategorySwitch = document.getElementById('isSubcategory') as HTMLInputElement;
      const parentField = document.getElementById('parentField');
      
      if (isSubcategorySwitch && parentField) {
        const isChecked = isSubcategorySwitch.checked;
        parentField.style.display = isChecked ? 'block' : 'none';
        
        // Agregar event listener para cambios futuros
        const handleChange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          parentField.style.display = target.checked ? 'block' : 'none';
        };
        
        isSubcategorySwitch.addEventListener('change', handleChange);
        
        // Cleanup
        return () => {
          isSubcategorySwitch.removeEventListener('change', handleChange);
        };
      }
    }
  }, [isDialogOpen, selectedTipo]);
  
  // Agrupar tipos por categoría
  const categorias = Object.values(TipoCatalogo).reduce((acc, tipo) => {
    const info = TIPO_LABELS[tipo];
    if (!acc[info.category]) acc[info.category] = [];
    acc[info.category].push(tipo);
    return acc;
  }, {} as Record<string, TipoCatalogo[]>);

  const handleSave = async (formData: FormData) => {
    startTransition(async () => {
      const fn = actions?.upsertCatalogoItem;
      if (!fn) {
        toast.error('Acción no disponible');
        return;
      }
      const result = await fn(formData as unknown as FormData);
      if (result.ok) {
        toast.success(result.message || "Guardado correctamente");
        setIsDialogOpen(false);
        setEditingItem(null);
        setSelectedTipo(null);
      } else {
        toast.error(result.message || "Error al guardar");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este elemento?")) return;
    
    startTransition(async () => {
      const fn = actions?.deleteCatalogoItem;
      if (!fn) {
        toast.error('Acción no disponible');
        return;
      }
      const result = await fn(id);
      if (result.ok) {
        toast.success(result.message || "Eliminado correctamente");
      } else {
        toast.error(result.message || "Error al eliminar");
      }
    });
  };

  const openNewItemDialog = (tipo: TipoCatalogo) => {
    setSelectedTipo(tipo);
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const openEditItemDialog = (item: CatalogoItem) => {
    setSelectedTipo(item.tipo);
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const renderItemList = (items: CatalogoItem[]) => {
    if (!items || items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No hay elementos configurados
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              {item.color && (
                <div 
                  className="w-4 h-4 rounded-full border" 
                  style={{ backgroundColor: item.color }}
                />
              )}
              <div className="flex-1">
                <div className="font-medium">{item.nombre}</div>
                <div className="text-sm text-muted-foreground">
                  Código: {item.codigo} {item.descripcion && `• ${item.descripcion}`}
                  {item.propiedades && (() => {
                    try {
                      const props = JSON.parse(item.propiedades as string);
                      if (props.isSubcategory) {
                        return <span className="ml-2 text-blue-600">• Subcategoría</span>;
                      }
                    } catch {}
                    return null;
                  })()}
                </div>
              </div>
              
              {/* Badge para mostrar el estado activo/inactivo */}
              <Badge variant={item.activo ? "default" : "secondary"}>
                {item.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            
            {canWrite && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditItemDialog(item)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={Object.keys(categorias)[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {Object.keys(categorias).map((categoria) => (
            <TabsTrigger key={categoria} value={categoria}>
              {categoria}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(categorias).map(([categoria, tipos]) => (
          <TabsContent key={categoria} value={categoria} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tipos.map((tipo) => {
                const info = TIPO_LABELS[tipo];
                const items = catalogosByTipo[tipo] || [];
                
                return (
                  <Card key={tipo}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCollapse(tipo)}
                            className="p-1 h-6 w-6"
                          >
                            {collapsedSections[tipo] ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <CardTitle className="text-lg">{info.label}</CardTitle>
                            <CardDescription>{info.description}</CardDescription>
                          </div>
                        </div>
                        {canWrite && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!actions?.reorderCatalogo) {
                                  toast.error('Acción de reordenar no disponible');
                                  return;
                                }
                                if (!confirm("Reordenar elementos por su orden actual?")) return;
                                const items = (catalogosByTipo as Record<string, CatalogoItem[]>)[tipo] || [];
                                const fd = new FormData();
                                fd.set("tipo", tipo);
                                fd.set("items", JSON.stringify(items.map((it: CatalogoItem, i: number) => ({ id: it.id, orden: i }))));
                                const res = await actions.reorderCatalogo(fd as unknown as FormData);
                                if (res.ok) toast.success(res.message || "Reordenado");
                                else toast.error(res.message || "Error al reordenar");
                              }}
                            >
                              Reordenar
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!actions?.resetCatalogoTipo) {
                                  toast.error('Acción de restablecer no disponible');
                                  return;
                                }
                                if (!confirm("Restablecer este catálogo a valores por defecto?")) return;
                                const res = await actions.resetCatalogoTipo(tipo);
                                if (res.ok) toast.success(res.message || "Restablecido");
                                else toast.error(res.message || "Error al restablecer");
                              }}
                            >
                              Restablecer
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openNewItemDialog(tipo)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    {!collapsedSections[tipo] && (
                      <CardContent>
                        {renderItemList(items)}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar elemento" : "Nuevo elemento"}
              {selectedTipo && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  • {TIPO_LABELS[selectedTipo]?.label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form 
            action={handleSave}
            className="space-y-4"
          >
            {editingItem && (
              <input type="hidden" name="id" value={editingItem.id} />
            )}
            {selectedTipo && (
              <input type="hidden" name="tipo" value={selectedTipo} />
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código*</Label>
                <Input
                  id="codigo"
                  name="codigo"
                  defaultValue={editingItem?.codigo || ""}
                  required
                  disabled={!!editingItem} // No permitir cambiar código en edición
                />
                {/* Campo hidden para asegurar que el código se envíe cuando está deshabilitado */}
                {editingItem && (
                  <input type="hidden" name="codigo" value={editingItem.codigo} />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  name="orden"
                  type="number"
                  defaultValue={editingItem?.orden || 0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre*</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={editingItem?.nombre || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                name="descripcion"
                defaultValue={editingItem?.descripcion || ""}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue={editingItem?.color || "#6B7280"}
                    className="w-16 h-10"
                  />
                  <Input
                    placeholder="#6B7280"
                    defaultValue={editingItem?.color || ""}
                    onChange={(e) => {
                      const colorInput = document.getElementById("color") as HTMLInputElement;
                      if (colorInput) colorInput.value = e.target.value;
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="icono">Icono</Label>
                <Input
                  id="icono"
                  name="icono"
                  placeholder="CheckCircle"
                  defaultValue={editingItem?.icono || ""}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                name="activo"
                defaultChecked={editingItem?.activo ?? true}
              />
              <Label htmlFor="activo">Activo</Label>
            </div>

            {/* Campos específicos para tipos de trabajo */}
            {selectedTipo === TipoCatalogo.TIPO_TRABAJO && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium">Configuración de Jerarquía</h4>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isSubcategory"
                    name="isSubcategory"
                    defaultChecked={editingItem?.propiedades ? (() => {
                      try {
                        const props = JSON.parse(editingItem.propiedades as string);
                        return props.isSubcategory === true;
                      } catch {
                        return false;
                      }
                    })() : false}
                  />
                  <Label htmlFor="isSubcategory">Es subcategoría de Servicios</Label>
                </div>

                {/* Campo para seleccionar el tipo padre (solo visible si es subcategoría) */}
                <div className="space-y-2" id="parentField" style={{ display: 'none' }}>
                  <Label htmlFor="parent">Tipo Padre</Label>
                  <select
                    id="parent"
                    name="parent"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue={editingItem?.propiedades ? (() => {
                      try {
                        const props = JSON.parse(editingItem.propiedades as string);
                        return props.parent || "";
                      } catch {
                        return "";
                      }
                    })() : ""}
                  >
                    <option value="">Seleccionar tipo padre...</option>
                    <option value="SERVICIOS">Servicios</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Solo las subcategorías pueden tener un tipo padre
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}