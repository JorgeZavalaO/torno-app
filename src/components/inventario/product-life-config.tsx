
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type MachineCategory = {
  id: string;
  categoria: string;
};

type LifeConfig = {
  id: string;
  machineCategoryId: string;
  vidaUtil: number;
  machineCategory: MachineCategory;
};

type Props = {
  sku: string;
  configs: LifeConfig[];
  categories: MachineCategory[];
  actions: {
    addMachineLife: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    removeMachineLife: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  };
};

export function ProductLifeConfig({ sku, configs, categories, actions }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [life, setLife] = useState<string>("");
  const [isPending, setIsPending] = useState(false);

  // Filter out categories that are already configured
  const availableCategories = categories.filter(
    (c) => !configs.some((cfg) => cfg.machineCategoryId === c.id)
  );

  async function handleAdd() {
    if (!selectedCategory || !life) return;
    setIsPending(true);
    const fd = new FormData();
    fd.append("productoId", sku);
    fd.append("machineCategoryId", selectedCategory);
    fd.append("vidaUtil", life);

    const res = await actions.addMachineLife(fd);
    setIsPending(false);
    if (res.ok) {
      toast.success(res.message);
      setSelectedCategory("");
      setLife("");
    } else {
      toast.error(res.message);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("¿Eliminar configuración?")) return;
    const fd = new FormData();
    fd.append("id", id);
    const res = await actions.removeMachineLife(fd);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Vida Útil por Máquina</h3>
      </div>

      <div className="space-y-2">
        {configs.map((cfg) => (
          <div
            key={cfg.id}
            className="flex items-center justify-between p-2 border rounded-md bg-muted/20"
          >
            <div>
              <div className="font-medium">{cfg.machineCategory.categoria}</div>
              <div className="text-sm text-muted-foreground">
                Vida útil: {Number(cfg.vidaUtil).toFixed(2)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(cfg.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {configs.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-2">
            No hay configuraciones específicas. Se usará la vida útil general.
          </div>
        )}
      </div>

      <div className="flex gap-2 items-end pt-2 border-t">
        <div className="flex-1 space-y-1">
          <Label>Categoría de Máquina</Label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            disabled={availableCategories.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-1">
          <Label>Vida Útil</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={life}
            onChange={(e) => setLife(e.target.value)}
          />
        </div>
        <Button onClick={handleAdd} disabled={isPending || !selectedCategory || !life}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar
        </Button>
      </div>
    </Card>
  );
}
