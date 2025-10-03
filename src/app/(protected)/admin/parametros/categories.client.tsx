"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/app/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Edit,
  Trash2,
  Wrench,
  TrendingDown,
  Loader2,
  Coins,
  TrendingUp
} from "lucide-react";

type Category = {
  id: string;
  categoria: string;
  laborCost: string;
  deprPerHour: string;
  descripcion: string | null;
  activo: boolean;
  machineCount?: number;
};

type Actions = {
  upsert: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  delete: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  sync: () => Promise<{ ok: boolean; message?: string; created?: number }>;
};

export default function CategoriesClient({
  categories,
  canWrite,
  actions,
  currency,
  tipoCambio, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  categories: Category[];
  canWrite: boolean;
  actions: Actions;
  currency: string;
  tipoCambio?: number;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const [formData, setFormData] = useState({
    categoria: "",
    laborCost: "",
    deprPerHour: "",
    descripcion: "",
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      categoria: category.categoria,
      laborCost: category.laborCost,
      deprPerHour: category.deprPerHour,
      descripcion: category.descripcion || "",
    });
    setDialogOpen(true);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fd = new FormData();
    fd.set("categoria", formData.categoria);
    fd.set("laborCost", formData.laborCost);
    fd.set("deprPerHour", formData.deprPerHour);
    fd.set("descripcion", formData.descripcion);
    fd.set("activo", "true");

    start(async () => {
      const result = await actions.upsert(fd);
      if (result.ok) {
        toast.success(result.message || "Categoría guardada");
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Error al guardar");
      }
    });
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    const fd = new FormData();
    fd.set("categoria", categoryToDelete);

    start(async () => {
      const result = await actions.delete(fd);
      if (result.ok) {
        toast.success(result.message || "Categoría eliminada");
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
        router.refresh();
      } else {
        toast.error(result.message || "Error al eliminar");
      }
    });
  };





  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Professional Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {categories.map((category) => (
            <Card 
              key={category.id} 
              className={`group p-5 border-slate-200/60 bg-slate-50/40 hover:bg-white hover:border-slate-300/60 hover:shadow-sm transition-all duration-200 ${!category.activo ? "opacity-60 bg-slate-100/40" : ""} dark:border-slate-700/60 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 dark:hover:border-slate-600/60`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/40">
                      <Wrench className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {category.categoria}
                        </h3>
                        {!category.activo && (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      {category.machineCount !== undefined && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {category.machineCount} máquina{category.machineCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {canWrite && category.activo && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                          <p className="text-sm">Editar categoría</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                            onClick={() => {
                              setCategoryToDelete(category.categoria);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                          <p className="text-sm">Eliminar categoría</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>

                {/* Cost Information */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2.5 bg-blue-50/60 rounded-lg border border-blue-100/60 dark:bg-blue-900/20 dark:border-blue-800/40">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <Coins className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Mano de Obra</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                        <p className="text-sm">Costo por hora de operación</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {formatCurrency(Number(category.laborCost), currency)}/h
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-orange-50/60 rounded-lg border border-orange-100/60 dark:bg-orange-900/20 dark:border-orange-800/40">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <TrendingDown className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Depreciación</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                        <p className="text-sm">Costo por desgaste y mantenimiento por hora</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-semibold text-orange-700 dark:text-orange-300">
                      {formatCurrency(Number(category.deprPerHour), currency)}/h
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60 dark:bg-emerald-900/20 dark:border-emerald-800/40">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">Total/Hora</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                        <p className="text-sm">Suma de mano de obra + depreciación</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">
                      {formatCurrency(Number(category.laborCost) + Number(category.deprPerHour), currency)}/h
                    </span>
                  </div>

                  {category.descripcion && (
                    <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
                      {category.descripcion}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Simple Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar" : "Nueva"} Categoría
                </DialogTitle>
                <DialogDescription>
                  Configura los costos de operación para esta categoría
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Category Name */}
                <div className="space-y-2">
                  <Label htmlFor="categoria">
                    Nombre de Categoría <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: TORNO PARALELO"
                    required
                    disabled={!!editingCategory}
                  />
                  {editingCategory && (
                    <p className="text-xs text-muted-foreground">
                      El nombre no puede modificarse después de crear la categoría
                    </p>
                  )}
                </div>

                {/* Cost Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Labor Cost */}
                  <div className="space-y-2">
                    <Label htmlFor="laborCost">
                      Mano de Obra ($/h) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="laborCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.laborCost}
                      onChange={(e) =>
                        setFormData({ ...formData, laborCost: e.target.value })
                      }
                      placeholder="3.43"
                      required
                    />
                  </div>

                  {/* Depreciation Cost */}
                  <div className="space-y-2">
                    <Label htmlFor="deprPerHour">
                      Depreciación ($/h) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="deprPerHour"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.deprPerHour}
                      onChange={(e) =>
                        setFormData({ ...formData, deprPerHour: e.target.value })
                      }
                      placeholder="0.95"
                      required
                    />
                  </div>
                </div>

                {/* Total Cost Summary */}
                {(formData.laborCost || formData.deprPerHour) && (
                  <div className="p-3 bg-muted rounded text-sm">
                    <div className="flex justify-between items-center">
                      <span>Costo Total por Hora:</span>
                      <span className="font-semibold">
                        {formatCurrency((Number(formData.laborCost) || 0) + (Number(formData.deprPerHour) || 0), currency)}/h
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="descripcion">
                    Descripción <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    placeholder="Descripción de la categoría..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={pending || !formData.categoria || !formData.laborCost || !formData.deprPerHour}
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Simple Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar categoría?</AlertDialogTitle>
              <AlertDialogDescription>
                La categoría &quot;{categoryToDelete}&quot; será desactivada. Esta acción se puede revertir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setCategoryToDelete(null)}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Desactivando...
                  </>
                ) : (
                  "Desactivar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
