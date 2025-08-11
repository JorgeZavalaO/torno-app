"use client";

import "./permissions.css";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Key, Plus, Search, Edit3, Trash2, Save, X, FileText } from "lucide-react";
import { PermissionStatusBadge, PermissionIcon, PermissionStats, EmptyState } from "../../../../components/permissions/components";

type Perm = { id: string; code: string; description: string | null };
type Actions = {
  createPermission: (fd: FormData) => Promise<{ ok: boolean; message?: string; item?: Perm }>;
  updatePermission: (fd: FormData) => Promise<{ ok: boolean; message?: string; item?: Perm }>;
  deletePermission: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function PermissionsClient({
  initialItems, canWrite, actions,
}: { initialItems: Perm[]; canWrite: boolean; actions: Actions }) {
  const [items, setItems] = useState<Perm[]>(initialItems);
  const [query, setQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(p =>
      p.code.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleCreated = (perm: Perm) => {
    setItems(prev => [perm, ...prev]); // lista en desc por createdAt en server
  };

  const handleUpdated = (perm: Perm) => {
    setItems(prev => prev.map(p => (p.id === perm.id ? perm : p)));
  };

  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Gestión de Permisos</h1>
                  <p className="text-muted-foreground">Administra los permisos del sistema y controla el acceso a funcionalidades</p>
                </div>
              </div>
            </div>

            <div className="hidden sm:block">
              <PermissionStats permissions={items} />
            </div>
          </div>

          {/* Barra búsqueda + Crear */}
          <Card className="p-6 border-0 shadow-sm bg-card/50 backdrop-blur-sm permissions-card-hover">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 max-w-md">
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4" />
                  Buscar permisos
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar por código o descripción..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {canWrite && (
                <CreateDialog
                  onAction={actions.createPermission}
                  isOpen={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                  onCreated={handleCreated}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Tabla */}
        <Card className="overflow-hidden border-0 shadow-sm permissions-card-hover">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead className="font-semibold w-1/3">Permiso</TableHead>
                <TableHead className="font-semibold">Descripción</TableHead>
                <TableHead className="font-semibold w-32 text-center">Estado</TableHead>
                {canWrite && <TableHead className="w-48 text-right font-semibold">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((permission, index) => (
                <PermissionRow
                  key={permission.id}
                  item={permission}
                  canWrite={canWrite}
                  actions={actions}
                  index={index}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 4 : 3}>
                    <EmptyState hasQuery={Boolean(query)} query={query} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

/* ---- Fila ---- */
function PermissionRow({
  item, canWrite, actions, index, onUpdated, onDeleted,
}: {
  item: Perm;
  canWrite: boolean;
  actions: Actions;
  index: number;
  onUpdated: (perm: Perm) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState<"code" | "description" | null>(null);
  const [code, setCode] = useState(item.code);
  const [description, setDescription] = useState(item.description ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSave = (field: "code" | "description") => {
    const fd = new FormData();
    fd.set("id", item.id);
    if (field === "code") fd.set("code", code);
    else fd.set("description", description);

    startTransition(async () => {
      const res = await actions.updatePermission(fd);
      if (res.ok && res.item) {
        toast.success(res.message ?? "Cambios guardados");
        onUpdated(res.item);
        setEditing(null);
      } else {
        toast.error(res.message ?? "Error al guardar");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`¿Estás seguro de eliminar el permiso "${item.code}"?\n\nEsta acción no se puede deshacer.`)) return;
    const fd = new FormData();
    fd.set("id", item.id);

    startTransition(async () => {
      const res = await actions.deletePermission(fd);
      if (res.ok) {
        toast.success(res.message ?? "Permiso eliminado");
        onDeleted(item.id);
      } else {
        toast.error(res.message ?? "Error al eliminar");
      }
    });
  };

  const handleCancel = (field: "code" | "description") => {
    if (field === "code") setCode(item.code);
    else setDescription(item.description ?? "");
    setEditing(null);
  };

  return (
    <TableRow className="group hover:bg-muted/20 transition-colors duration-200 permissions-row permissions-stagger" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Código */}
      <TableCell className="py-4">
        {canWrite && editing === "code" ? (
          <div className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-8 font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave("code");
                if (e.key === "Escape") handleCancel("code");
              }}
              autoFocus
            />
            <Button size="sm" onClick={() => handleSave("code")} disabled={isPending || !code.trim()} className="h-8 px-2">
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleCancel("code")} className="h-8 px-2">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <PermissionIcon permission={item} />
            <div className="flex-1">
              <div className="font-mono text-sm font-semibold">{item.code}</div>
              <div className="text-xs text-muted-foreground">ID: {item.id.slice(0, 8)}...</div>
            </div>
            {canWrite && (
              <Button variant="ghost" size="sm" onClick={() => setEditing("code")} className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2">
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8"
              placeholder="Descripción del permiso..."
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
        <PermissionStatusBadge permission={item} />
      </TableCell>

      {/* Acciones */}
      {canWrite && (
        <TableCell className="text-right py-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <Trash2 className="h-4 w-4" />
            </Button>
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
  onAction: Actions["createPermission"];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (perm: Perm) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const fd = new FormData();
    fd.set("code", code.trim());
    fd.set("description", description.trim());

    startTransition(async () => {
      const res = await onAction(fd);
      if (res.ok && res.item) {
        toast.success(res.message ?? "Permiso creado exitosamente");
        onCreated(res.item);
        setCode("");
        setDescription("");
        onOpenChange(false);
      } else {
        toast.error(res.message ?? "Error al crear el permiso");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 transition-all duration-200 hover:scale-105">
          <Plus className="h-4 w-4" />
          Nuevo Permiso
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Crear Nuevo Permiso</DialogTitle>
              <p className="text-sm text-muted-foreground">Define un nuevo permiso para controlar el acceso</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="permission-code" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Código del permiso *
              </Label>
              <Input
                id="permission-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: users.read, orders.write, reports.admin..."
                required
                maxLength={100}
                disabled={isPending}
                className="font-mono"
              />
              <div className="text-xs text-muted-foreground">Usa notación de puntos. Ej: modulo.accion ({code.length}/100)</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission-description" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descripción (opcional)
              </Label>
              <Textarea
                id="permission-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué permite hacer este permiso..."
                rows={3}
                maxLength={300}
                disabled={isPending}
              />
              <div className="text-xs text-muted-foreground">{description.length}/300 caracteres</div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending || !code.trim()} className="min-w-24">
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creando...
                </div>
              ) : "Crear Permiso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
