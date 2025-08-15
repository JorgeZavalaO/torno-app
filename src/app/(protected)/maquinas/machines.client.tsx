"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Settings } from "lucide-react";

import { MachineForm } from "@/components/machines/machine-form";
import { MachinesTable } from "@/components/machines/machines-table";
import { MachinesFilters } from "@/components/machines/machines-filters";

type Row = {
  id: string; codigo: string; nombre: string; categoria?: string|null; estado: "ACTIVA"|"MANTENIMIENTO"|"BAJA";
  ubicacion?: string|null; horasUlt30d: number; pendMant: number;
  ultimoEvento?: { tipo: string; inicio: string|Date|null; fin?: string|Date|null } | null;
  fabricante?: string|null; modelo?: string|null; serie?: string|null; capacidad?: string|null; notas?: string|null;
};

type Actions = {
  upsertMachine: (fd: FormData)=>Promise<{ok:boolean; message?:string; id?:string}>;
  deleteMachine: (id: string)=>Promise<{ok:boolean; message?:string}>;
  // (Opcionales si los pasas, no los usamos en esta pantalla)
  scheduleMaintenance?: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
  closeMaintenance?: (fd: FormData)=>Promise<{ok:boolean; message?:string}>;
};

export default function MachinesClient({ canWrite, rows, actions }:{
  canWrite: boolean; rows: Row[]; actions: Actions;
}) {
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form state (modal)
  const [formMachine, setFormMachine] = useState<Partial<Row> | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Categorías únicas para filtros
  const categories = useMemo(() => {
    const cats = new Set<string>();
    rows.forEach(r => { if (r.categoria) cats.add(r.categoria); });
    return Array.from(cats).sort();
  }, [rows]);

  // Filtrado de máquinas
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchesSearch = !searchQuery.trim() || [
        r.codigo, r.nombre, r.categoria, r.ubicacion
      ].some(field => field?.toLowerCase().includes(searchQuery.trim().toLowerCase()));
      const matchesStatus = statusFilter === "all" || r.estado === statusFilter;
      const matchesCategory = categoryFilter === "all" || r.categoria === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [rows, searchQuery, statusFilter, categoryFilter]);

  const handleEdit = (machine: Row) => {
    setFormMachine(machine);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta máquina?")) return;
    const promise = actions.deleteMachine(id);
    await toast.promise(promise, {
      loading: "Eliminando máquina...",
      success: (result) => result.message || "Máquina eliminada correctamente",
      error: (error) => error?.message || "Error al eliminar la máquina"
    });
  };

  const handleSaveMachine = async (fd: FormData) => {
    try {
      const result = await actions.upsertMachine(fd);
      toast.success(result.message || "Máquina guardada correctamente");
      return result;
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string'
        ? (err as Record<string, unknown>).message as string
        : undefined;
      toast.error(message || "Error al guardar la máquina");
      // Re-lanzar para que el llamador pueda manejar el fallo si quiere
      throw err;
    }
  };

  const handleNewMachine = () => {
    setFormMachine({ estado: "ACTIVA" });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormMachine(undefined);
    setIsFormOpen(false);
  };

  // Si cierro y abro, quiero estado por defecto ACTIVA
  useEffect(() => {
    if (isFormOpen && !formMachine?.id && !formMachine?.estado) {
      setFormMachine((f)=>({ ...(f||{}), estado: "ACTIVA" }));
    }
  }, [isFormOpen, formMachine]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maquinarias</h1>
          <p className="text-muted-foreground mt-1">Gestión y seguimiento de equipos de producción</p>
        </div>
        {canWrite && (
          <Button onClick={handleNewMachine} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva máquina
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <MachinesFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            categories={categories}
          />
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{filteredRows.length}</p>
                <p className="text-xs text-muted-foreground">Total máquinas</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredRows.filter(r => r.estado === "ACTIVA").length}
                </p>
                <p className="text-xs text-muted-foreground">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredRows.filter(r => r.estado === "MANTENIMIENTO").length}
                </p>
                <p className="text-xs text-muted-foreground">En mantenimiento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {filteredRows.reduce((acc, r) => acc + r.pendMant, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Mant. pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de máquinas */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MachinesTable
            machines={filteredRows}
            canWrite={canWrite}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Modal de crear/editar */}
      {canWrite && (
        <MachineForm
          machine={formMachine}
          isOpen={isFormOpen}
          onSave={handleSaveMachine}
          onCancel={handleCloseForm}
        />
      )}
    </div>
  );
}
