"use client";

import React, { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, UserPlus, Search, Shield, X, Trash2, Edit } from "lucide-react";

type Role = { id: string; name: string; description?: string | null };
type User = { id: string; email: string; displayName?: string | null; roles: { id: string; name: string }[] };
type Actions = {
  assignRoleToUser: (fd: FormData) => Promise<{ ok: boolean; message?: string; user?: { id: string; email: string; displayName: string | null } }>;
  removeUserRole: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  createUser?: (fd: FormData) => Promise<{ ok: boolean; message?: string; user?: { id: string; email: string; displayName: string | null } }>;
  updateUser?: (fd: FormData) => Promise<{ ok: boolean; message?: string; user?: { id: string; email: string; displayName: string | null } }>;
  deleteUser?: (fd: FormData) => Promise<{ ok: boolean; message?: string; user?: { id: string } }>;
};

type Props = {
  initialUsers: User[];
  roles: Role[];
  actions: Actions;
  canAssign?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
};

export default function UsersClient({ initialUsers, roles, actions, canAssign, canUpdate, canDelete }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  
  // Estados para confirmaciones
  const [confirmRoleRemove, setConfirmRoleRemove] = useState<{ userId: string; roleId: string; roleName: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  // Usuarios filtrados
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesQuery = q === "" || user.email.toLowerCase().includes(q.toLowerCase()) || 
                          (user.displayName || "").toLowerCase().includes(q.toLowerCase());
      const matchesRole = roleFilter === "all" || 
                         (roleFilter === "no-roles" && user.roles.length === 0) ||
                         user.roles.some(role => role.name === roleFilter);
      return matchesQuery && matchesRole;
    });
  }, [users, q, roleFilter]);

  // Asignación rápida de roles
  const handleQuickAssign = (formData: FormData) => {
    startTransition(async () => {
      const result = await actions.assignRoleToUser(formData);
      if (result.ok) {
        toast.success("Rol asignado correctamente");
        if (result.user) {
          setUsers(prev => {
            const existing = prev.find(u => u.id === result.user!.id);
            if (existing) return prev;
            return [...prev, { ...result.user!, roles: [] }];
          });
        }
        // Reset form
        const form = document.querySelector('form[data-quick-assign]') as HTMLFormElement;
        if (form) form.reset();
      } else {
        toast.error(result.message || "Error al asignar rol");
      }
    });
  };

  // Remover rol
  const handleRemoveRole = (userId: string, roleId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("roleId", roleId);
      const result = await actions.removeUserRole(formData);
      if (result.ok) {
        toast.success("Rol removido correctamente");
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, roles: user.roles.filter(role => role.id !== roleId) }
            : user
        ));
      } else {
        toast.error(result.message || "Error al remover rol");
      }
    });
  };

  // Crear usuario
  const handleCreateUser = (formData: FormData) => {
    if (!actions.createUser) {
      toast.error("Operación no permitida");
      return;
    }
    startTransition(async () => {
      const result = await actions.createUser!(formData);
      if (result.ok) {
        toast.success("Usuario creado correctamente");
        if (result.user) {
          setUsers(prev => [...prev, { ...result.user!, roles: [] }]);
        }
        setCreateOpen(false);
      } else {
        toast.error(result.message || "Error al crear usuario");
      }
    });
  };

  // Actualizar usuario
  const handleUpdateUser = (formData: FormData) => {
    if (!actions.updateUser || !current) return;
    formData.set("userId", current.id);
    startTransition(async () => {
      const result = await actions.updateUser!(formData);
      if (result.ok) {
        toast.success("Usuario actualizado correctamente");
        if (result.user) {
          setUsers(prev => prev.map(user => 
            user.id === current.id 
              ? { ...user, ...result.user! }
              : user
          ));
        }
        setEditOpen(false);
      } else {
        toast.error(result.message || "Error al actualizar usuario");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona usuarios y sus roles</p>
        </div>
        {canAssign && (
          <Button onClick={() => { setCurrent(null); setCreateOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="no-roles">Sin roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-32">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10">
                        {user.displayName?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.displayName || user.email}</div>
                      {user.displayName && (
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <div key={role.id} className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="mr-1 h-3 w-3" />
                          {role.name}
                        </Badge>
                        {canAssign && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-destructive/10"
                            title="Remover rol"
                            onClick={() => setConfirmRoleRemove({ userId: user.id, roleId: role.id, roleName: role.name })}
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {user.roles.length === 0 && (
                      <span className="text-sm text-muted-foreground">Sin roles</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setCurrent(user); setEditOpen(true); }}
                        className="h-8 w-8 p-0"
                        title="Editar usuario"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        title="Eliminar usuario"
                        onClick={() => setConfirmDelete(user)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No se encontraron usuarios</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Asignación rápida de roles */}
      {canAssign && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Asignación rápida de roles</h3>
              <p className="text-sm text-blue-700">Asigna roles a usuarios por email</p>
            </div>
          </div>
          <form action={handleQuickAssign} data-quick-assign className="flex gap-3">
            <Input
              placeholder="Email del usuario..."
              name="email"
              type="email"
              required
              className="flex-1"
            />
            <Select name="roleName" required>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Asignando..." : "Asignar"}
            </Button>
          </form>
        </Card>
      )}

      {/* Modales */}
      <CreateUserModal 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
        onSubmit={handleCreateUser} 
        isPending={isPending} 
      />
      
      <EditUserModal 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        user={current} 
        onSubmit={handleUpdateUser} 
        isPending={isPending} 
      />

      {/* Diálogos de confirmación */}
      <ConfirmDialog
        open={!!confirmRoleRemove}
        onOpenChange={(open) => !open && setConfirmRoleRemove(null)}
        title="¿Remover rol?"
        description={
          confirmRoleRemove 
            ? `¿Estás seguro de que deseas remover el rol "${confirmRoleRemove.roleName}"?`
            : ""
        }
        onConfirm={() => {
          if (confirmRoleRemove) {
            handleRemoveRole(confirmRoleRemove.userId, confirmRoleRemove.roleId);
            setConfirmRoleRemove(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="¿Eliminar usuario?"
        description={
          confirmDelete 
            ? `¿Estás seguro de que deseas eliminar al usuario ${confirmDelete.displayName || confirmDelete.email}?`
            : ""
        }
        destructive
        onConfirm={() => {
          if (confirmDelete && actions.deleteUser) {
            const formData = new FormData();
            formData.set("userId", confirmDelete.id);
            startTransition(async () => {
              const result = await actions.deleteUser!(formData);
              if (result.ok) {
                toast.success("Usuario eliminado correctamente");
                setUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
              } else {
                toast.error(result.message || "Error al eliminar usuario");
              }
              setConfirmDelete(null);
            });
          }
        }}
      />
    </div>
  );
}

// Modal para crear usuario
function CreateUserModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isPending 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSubmit: (formData: FormData) => void; 
  isPending: boolean; 
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear nuevo usuario</DialogTitle>
          <DialogDescription>
            Ingresa los datos del usuario. La contraseña es opcional.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input required name="email" type="email" />
          </div>
          <div>
            <Label>Nombre para mostrar (opcional)</Label>
            <Input name="displayName" />
          </div>
          <div>
            <Label>Contraseña (opcional)</Label>
            <Input name="password" type="password" />
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <Input name="passwordConfirm" type="password" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Modal para editar usuario
function EditUserModal({ 
  open, 
  onOpenChange, 
  user, 
  onSubmit, 
  isPending 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  user: User | null; 
  onSubmit: (formData: FormData) => void; 
  isPending: boolean; 
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos del usuario. Deja la contraseña vacía si no quieres cambiarla.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input 
              required 
              name="email" 
              type="email" 
              defaultValue={user?.email || ""} 
            />
          </div>
          <div>
            <Label>Nombre para mostrar</Label>
            <Input 
              name="displayName" 
              defaultValue={user?.displayName || ""} 
            />
          </div>
          <div>
            <Label>Nueva contraseña (opcional)</Label>
            <Input name="password" type="password" />
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <Input name="passwordConfirm" type="password" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}