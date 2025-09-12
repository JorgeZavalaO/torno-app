"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import CreateEditDialog from "@/components/ui/create-edit-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Plus, Search, Edit3, Trash2, Save, X } from "lucide-react";

type Role = { id: string; name: string; description: string | null };
type Actions = {
  createRole: (fd: FormData) => Promise<{ ok: boolean; message?: string; item?: Role }>;
  updateRole: (fd: FormData) => Promise<{ ok: boolean; message?: string; item?: Role }>;
  deleteRole: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function RolesClient({
  initialItems, canWrite, actions,
}: { initialItems: Role[]; canWrite: boolean; actions: Actions }) {
  const [items, setItems] = useState<Role[]>(initialItems);
  const [q, setQ] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const searchTerm = q.trim().toLowerCase();
    if (!searchTerm) return items;
    return items.filter(role =>
      role.name.toLowerCase().includes(searchTerm) ||
      (role.description ?? "").toLowerCase().includes(searchTerm)
    );
  }, [q, items]);

  const handleCreated = (role: Role) => setItems(prev => [role, ...prev]);
  const handleUpdated = (role: Role) => setItems(prev => prev.map(r => (r.id === role.id ? role : r)));
  const handleDeleted = (id: string) => setItems(prev => prev.filter(r => r.id !== id));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Roles del Sistema</h1>
                <p className="text-muted-foreground">Define y gestiona los roles de usuario y sus permisos</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-medium">{items.length}</span>
              <span className="text-muted-foreground">roles</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">{items.filter(r => r.description).length}</span>
              <span className="text-muted-foreground">con descripción</span>
            </div>
          </div>
        </div>

        {/* Search + Create */}
        <Card className="p-6 border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Search className="h-4 w-4" />
                Buscar roles
              </Label>
              <div className="relative">
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {canWrite && (
              <CreateDialog
                onAction={actions.createRole}
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onCreated={handleCreated}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/30">
              <TableHead className="font-semibold w-1/4">Rol</TableHead>
              <TableHead className="font-semibold">Descripción</TableHead>
              <TableHead className="font-semibold w-32 text-center">Estado</TableHead>
              {canWrite && <TableHead className="w-48 text-right font-semibold">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((role, index) => (
              <RoleRow
                key={role.id}
                item={role}
                canWrite={canWrite}
                actions={actions}
                index={index}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 4 : 3} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                      <Shield className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-foreground">{q ? "No hay coincidencias" : "Sin roles configurados"}</h3>
                      <p className="text-sm">{q ? "Intenta ajustar tu búsqueda" : "Crea el primer rol para comenzar"}</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---- Fila ---- */
function RoleRow({
  item, canWrite, actions, index, onUpdated, onDeleted,
}: {
  item: Role;
  canWrite: boolean;
  actions: Actions;
  index: number;
  onUpdated: (role: Role) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState<"name" | "description" | null>(null);
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSave = (field: "name" | "description") => {
    const fd = new FormData();
    fd.set("id", item.id);
    if (field === "name") {
      fd.set("name", name);
      fd.set("description", item.description ?? "");
    } else {
      fd.set("name", item.name);
      fd.set("description", desc);
    }

    startTransition(async () => {
      const res = await actions.updateRole(fd);
      if (res.ok && res.item) {
        toast.success(res.message ?? "Cambios guardados");
        onUpdated(res.item);
        setEditing(null);
      } else {
        toast.error(res.message ?? "Error al guardar");
      }
    });
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleDelete = () => setConfirmOpen(true);

  const handleCancel = (field: "name" | "description") => {
    if (field === "name") setName(item.name);
    else setDesc(item.description ?? "");
    setEditing(null);
  };

  return (
    <TableRow className="group hover:bg-muted/20 transition-colors duration-200" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Nombre */}
      <TableCell className="py-4">
        {canWrite && editing === "name" ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave("name");
                if (e.key === "Escape") handleCancel("name");
              }}
              autoFocus
            />
            <Button size="sm" onClick={() => handleSave("name")} disabled={isPending || !name.trim()} className="h-8 px-2">
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleCancel("name")} className="h-8 px-2">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground">ID: {item.id.slice(0, 8)}...</div>
            </div>
            {canWrite && (
              <Button variant="ghost" size="sm" onClick={() => setEditing("name")} className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2">
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </TableCell>

      {/* Descripción */}
      <TableCell className="py-4">
        {canWrite && editing === "description" ? (
          <div className="flex items-center gap-2">
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="h-8"
              placeholder="Descripción del rol..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave("description");
                if (e.key === "Escape") handleCancel("description");
              }}
              autoFocus
            />
            <Button size="sm" onClick={() => handleSave("description")} disabled={isPending} className="h-8 px-2">
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleCancel("description")} className="h-8 px-2">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm">{item.description || <span className="text-muted-foreground italic">Sin descripción</span>}</div>
            </div>
            {canWrite && (
              <Button variant="ghost" size="sm" onClick={() => setEditing("description")} className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2">
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </TableCell>

      {/* Estado */}
      <TableCell className="text-center py-4">
        <Badge variant={item.description ? "default" : "secondary"} className="text-xs">
          {item.description ? "Completo" : "Sin descripción"}
        </Badge>
      </TableCell>

      {/* Acciones */}
      {canWrite && (
        <TableCell className="text-right py-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <Trash2 className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Eliminar rol"
              description={`¿Estás seguro de eliminar el rol "${item.name}"? Esta acción no se puede deshacer.`}
              confirmText="Eliminar"
              destructive
              loading={isPending}
              onConfirm={() => {
                const fd = new FormData();
                fd.set("id", item.id);
                startTransition(async () => {
                  const res = await actions.deleteRole(fd);
                  if (res.ok) {
                    toast.success(res.message ?? "Rol eliminado");
                    onDeleted(item.id);
                    setConfirmOpen(false);
                  } else {
                    toast.error(res.message ?? "Error al eliminar");
                  }
                });
              }}
            />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

/* ---- CreateDialog ---- */
function CreateDialog({
  onAction, isOpen, onOpenChange, onCreated,
}: {
  onAction: Actions["createRole"];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (role: Role) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 transition-all duration-200 hover:scale-105">
          <Plus className="h-4 w-4" />
          Nuevo Rol
        </Button>
      </DialogTrigger>
      <CreateEditDialog
        open={isOpen}
        onOpenChange={onOpenChange}
        title="Crear Nuevo Rol"
        description="Define un nuevo rol para el sistema"
        submitLabel="Crear Rol"
        fields={[
          { name: "name", label: "Nombre del rol", required: true, maxLength: 80, placeholder: "Ej: Administrador, Editor..." },
          { name: "description", label: "Descripción (opcional)", textarea: true, maxLength: 300, placeholder: "Describe el rol..." },
        ]}
        onSubmit={async (fd) => {
          const res = await onAction(fd);
          if (res.ok && res.item) {
            toast.success(res.message ?? "Rol creado exitosamente");
            onCreated(res.item);
            onOpenChange(false);
          } else {
            toast.error(res.message ?? "Error al crear el rol");
          }
        }}
      />
    </Dialog>
  );
}
