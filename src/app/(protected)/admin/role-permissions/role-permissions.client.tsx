"use client";

import { useTransition, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { grantPermissionToRole, revokePermissionFromRole, setRolePermissions } from "./actions";
import { createRole, updateRole, deleteRole } from "../roles/actions";
import { createPermission, updatePermission, deletePermission } from "../permissions/actions";
import { toast } from "sonner"

type Role = { id: string; name: string; description?: string | null };
type Initial = {
  role: { id: string; name: string; description: string | null } | null;
  permissions: { id: string; code: string; description: string }[];
  assignedIds: string[];
};

// Componente para el modal de crear/editar rol
function RoleModal({
  role,
  open,
  onOpenChange,
  onSuccess,
}: {
  role?: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", formData.name);
    fd.set("description", formData.description);
    if (role) fd.set("id", role.id);

    startTransition(async () => {
      const result = role 
        ? await updateRole(fd)
        : await createRole(fd);
      
      if (result.ok) {
        toast.success(result.message || (role ? "Rol actualizado" : "Rol creado"));
        onSuccess();
        onOpenChange(false);
        setFormData({ name: "", description: "" });
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Editar Rol" : "Crear Nuevo Rol"}</DialogTitle>
          <DialogDescription>
            {role ? "Modifica los datos del rol" : "Crea un nuevo rol para el sistema"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del rol"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del rol (opcional)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !formData.name.trim()}>
              {isPending ? "Guardando..." : (role ? "Actualizar" : "Crear")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente para el modal de crear/editar permiso
function PermissionModal({
  permission,
  open,
  onOpenChange,
  onSuccess,
}: {
  permission?: { id: string; code: string; description: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    code: permission?.code || "",
    description: permission?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("code", formData.code);
    fd.set("description", formData.description);
    if (permission) fd.set("id", permission.id);

    startTransition(async () => {
      const result = permission 
        ? await updatePermission(fd)
        : await createPermission(fd);
      
      if (result.ok) {
        toast.success(result.message || (permission ? "Permiso actualizado" : "Permiso creado"));
        onSuccess();
        onOpenChange(false);
        setFormData({ code: "", description: "" });
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{permission ? "Editar Permiso" : "Crear Nuevo Permiso"}</DialogTitle>
          <DialogDescription>
            {permission ? "Modifica los datos del permiso" : "Crea un nuevo permiso para el sistema"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="permissions.read"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del permiso (opcional)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !formData.code.trim()}>
              {isPending ? "Guardando..." : (permission ? "Actualizar" : "Crear")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente para el modal de confirmación de eliminación
function DeleteConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente para el modal de asignación masiva
function BulkAssignModal({
  open,
  onOpenChange,
  role,
  permissions,
  assigned,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: { id: string; name: string; description: string | null } | null;
  permissions: { id: string; code: string; description: string }[];
  assigned: Set<string>;
  onSave: (selectedIds: Set<string>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [tempAssigned, setTempAssigned] = useState<Set<string>>(new Set(assigned));
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter(p => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [filter, permissions]);

  const handleSave = () => {
    startTransition(() => {
      onSave(tempAssigned);
      onOpenChange(false);
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setTempAssigned(new Set(filtered.map(p => p.id)));
    } else {
      setTempAssigned(new Set());
    }
  };

  const allChecked = filtered.length > 0 && filtered.every(p => tempAssigned.has(p.id));
  const someChecked = filtered.some(p => tempAssigned.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Asignar Permisos - {role?.name}</DialogTitle>
          <DialogDescription>
            Selecciona los permisos que deseas asignar a este rol
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar permiso</Label>
            <Input
              placeholder="permissions.read, 'leer permisos'…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allChecked}
              onCheckedChange={toggleAll}
              aria-label="Seleccionar todos"
            />
            <Label>Seleccionar todos ({filtered.length} permisos) {someChecked && !allChecked ? "(parcial)" : ""}</Label>
          </div>
          <div className="border rounded-md max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">✓</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const checked = tempAssigned.has(p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val: boolean) => {
                            const newSet = new Set(tempAssigned);
                            if (val) {
                              newSet.add(p.id);
                            } else {
                              newSet.delete(p.id);
                            }
                            setTempAssigned(newSet);
                          }}
                          aria-label={`Asignar ${p.code}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.code}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.description || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground">
            Seleccionados: {tempAssigned.size} de {permissions.length} permisos
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar Asignación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RolePermissionsClient({
  roles, initial, canWrite,
}: { roles: Role[]; initial: Initial; canWrite: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [roleId, setRoleId] = useState<string>(initial.role?.id ?? "");
  const [filter, setFilter] = useState("");
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initial.assignedIds));

  // Estados para modales
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<{ id: string; code: string; description: string } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState<{ type: 'role' | 'permission'; item: Role | { id: string; code: string; description: string } | null }>({ type: 'role', item: null });
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  function onSelectRole(id: string) {
    const next = new URLSearchParams(sp?.toString());
    if (id) next.set("roleId", id); else next.delete("roleId");
    setRoleId(id);
    router.push(`/admin/role-permissions?${next.toString()}`);
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return initial.permissions;
    return initial.permissions.filter(p => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [filter, initial.permissions]);

  async function toggle(pid: string, nextChecked: boolean) {
    if (!roleId || !canWrite) return;
    const fd = new FormData();
    fd.set("roleId", roleId);
    fd.set("permissionId", pid);
    startTransition(async () => {
      const res = nextChecked ? await grantPermissionToRole(fd) : await revokePermissionFromRole(fd);
      if (res.ok) {
        setAssigned(prev => {
          const n = new Set(prev);
          if (nextChecked) {
            n.add(pid);
          } else {
            n.delete(pid);
          }
          return n;
        });
        toast.success(res.message ?? "Actualizado");
      } else {
        toast.error(res.message);
      }
      router.refresh();
    });
  }

  async function saveBulk(selectedIds: Set<string>) {
    if (!roleId || !canWrite) return;
    const fd = new FormData();
    fd.set("roleId", roleId);
    fd.set("permissionIds", [...selectedIds].join(","));
    startTransition(async () => {
      const res = await setRolePermissions(fd);
      if (res.ok) {
        setAssigned(selectedIds);
        toast.success(res.message ?? "Permisos actualizados");
      } else {
        toast.error(res.message ?? "Error al actualizar permisos");
      }
      router.refresh();
    });
  }

  function handleRefresh() {
    router.refresh();
  }

  function handleCreateRole() {
    setEditingRole(null);
    setRoleModalOpen(true);
  }

  function handleEditRole(role: Role) {
    setEditingRole(role);
    setRoleModalOpen(true);
  }

  function handleDeleteRole(role: Role) {
    setDeleteData({ type: 'role', item: role });
    setDeleteModalOpen(true);
  }

  function handleCreatePermission() {
    setEditingPermission(null);
    setPermissionModalOpen(true);
  }

  function handleEditPermission(permission: { id: string; code: string; description: string }) {
    setEditingPermission(permission);
    setPermissionModalOpen(true);
  }

  function handleDeletePermission(permission: { id: string; code: string; description: string }) {
    setDeleteData({ type: 'permission', item: permission });
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteData.item) return;
    
    const fd = new FormData();
    fd.set("id", deleteData.item.id);
    
    startTransition(async () => {
      const result = deleteData.type === 'role' 
        ? await deleteRole(fd)
        : await deletePermission(fd);
      
      if (result.ok) {
        toast.success(result.message || `${deleteData.type === 'role' ? 'Rol' : 'Permiso'} eliminado`);
        setDeleteModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const currentRole = roles.find(r => r.id === roleId);
  const selectedPermissionCount = assigned.size;
  const totalPermissionCount = initial.permissions.length;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Permisos por Rol</h1>
          <p className="text-muted-foreground">
            Administra los permisos asignados a cada rol del sistema
          </p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <Button variant="outline" onClick={handleCreateRole}>
                + Nuevo Rol
              </Button>
              <Button variant="outline" onClick={handleCreatePermission}>
                + Nuevo Permiso
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de selección de rol */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Seleccionar Rol</h2>
            {canWrite && currentRole && (
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleEditRole(currentRole)}
                >
                  Editar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDeleteRole(currentRole)}
                >
                  Eliminar
                </Button>
              </div>
            )}
          </div>
          
          <Select value={roleId} onValueChange={onSelectRole}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentRole && (
            <div className="space-y-2">
              <div>
                <div className="font-medium">{currentRole.name}</div>
                <div className="text-sm text-muted-foreground">
                  {currentRole.description || "Sin descripción"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedPermissionCount}/{totalPermissionCount} permisos
                </Badge>
              </div>
              {canWrite && (
                <Button 
                  className="w-full" 
                  onClick={() => setBulkModalOpen(true)}
                  variant="outline"
                >
                  Asignación Masiva
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Panel de permisos */}
        <Card className="lg:col-span-2 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Permisos Disponibles</h2>
              <div className="text-sm text-muted-foreground">
                {filtered.length} de {initial.permissions.length} permisos
              </div>
            </div>

            <div className="space-y-2">
              <Label>Buscar permiso</Label>
              <Input
                placeholder="Buscar por código o descripción..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Asignado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    {canWrite && <TableHead className="w-24">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const isAssigned = assigned.has(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={(checked: boolean) => toggle(p.id, checked)}
                            disabled={!canWrite || !roleId}
                            aria-label={`${isAssigned ? 'Desasignar' : 'Asignar'} ${p.code}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{p.code}</TableCell>
                        <TableCell className="text-sm">{p.description || "—"}</TableCell>
                        {canWrite && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditPermission(p)}
                              >
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeletePermission(p)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canWrite ? 4 : 3} className="text-center text-muted-foreground py-8">
                        {filter ? "No se encontraron permisos con ese filtro" : "No hay permisos disponibles"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>

      {/* Modales */}
      <RoleModal
        role={editingRole}
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        onSuccess={handleRefresh}
      />

      <PermissionModal
        permission={editingPermission}
        open={permissionModalOpen}
        onOpenChange={setPermissionModalOpen}
        onSuccess={handleRefresh}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={`Eliminar ${deleteData.type === 'role' ? 'Rol' : 'Permiso'}`}
        description={`¿Estás seguro de que quieres eliminar ${deleteData.type === 'role' ? 'el rol' : 'el permiso'} "${
          deleteData.type === 'role' 
            ? (deleteData.item as Role)?.name 
            : (deleteData.item as { id: string; code: string; description: string })?.code
        }"? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        isPending={isPending}
      />

      <BulkAssignModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        role={currentRole ? {
          id: currentRole.id,
          name: currentRole.name,
          description: currentRole.description || null
        } : null}
        permissions={initial.permissions}
        assigned={assigned}
        onSave={saveBulk}
      />
    </div>
  );
}
