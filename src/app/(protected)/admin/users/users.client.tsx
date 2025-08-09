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
import { Label as UiLabel } from "@/components/ui/label";
// Nota: No se requiere Textarea aquí
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, UserPlus, Search, Mail, Shield, X, Plus, Filter, Trash2 } from "lucide-react";

type Role = { id: string; name: string; description?: string | null };
type User = { id: string; email: string; displayName?: string | null; roles: { id: string; name: string }[] };
type Actions = {
  assignRoleToUser: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  removeUserRole: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  createUser?: (fd: FormData) => Promise<{ ok: boolean; message?: string; user?: { id: string; email: string; displayName: string | null } }>;
  updateUser?: (fd: FormData) => Promise<{ ok: boolean; message?: string; user?: { id: string; email: string; displayName: string | null } }>;
  deleteUser?: (fd: FormData) => Promise<{ ok: boolean; message?: string; user?: { id: string } }>;
};

// Función para generar iniciales del usuario
function getUserInitials(email: string, displayName?: string | null): string {
  if (displayName) {
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

// Función para generar colores de avatar basados en el email
function getAvatarColor(email: string): string {
  const colors = [
    'bg-red-100 text-red-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-yellow-100 text-yellow-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
    'bg-orange-100 text-orange-600'
  ];
  const index = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export default function UsersClient({
  initialUsers, roles, canAssign, actions,
}: { initialUsers: User[]; roles: Role[]; canAssign: boolean; actions: Actions }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState<string>();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // Estado de modales
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [current, setCurrent] = useState<User | null>(null);

  const filtered = useMemo(() => {
    let filtered = users;
    
    // Filtro por texto de búsqueda
    const searchTerm = q.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(searchTerm) ||
        (u.displayName ?? "").toLowerCase().includes(searchTerm) ||
        u.roles.some(r => r.name.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filtro por rol
    if (roleFilter !== "all") {
      if (roleFilter === "no-roles") {
        filtered = filtered.filter(u => u.roles.length === 0);
      } else {
        filtered = filtered.filter(u => 
          u.roles.some(r => r.name === roleFilter)
        );
      }
    }
    
    return filtered;
  }, [q, users, roleFilter]);

  const handleAssignRole = (fd: FormData) => {
    if (!(email && roleName)) return;
    
    startTransition(async () => {
      fd.set("email", email);
      fd.set("roleName", roleName!);
      const res = await actions.assignRoleToUser(fd);
      
      if (res.ok) {
        toast.success(res.message ?? "Rol asignado correctamente");
        setEmail("");
        setRoleName(undefined);
        // Opcional: podríamos actualizar roles localmente si tuviéramos el user id
        // Para simplicidad, no se actualiza aquí porque la acción no devuelve el usuario
      } else {
        toast.error(res.message ?? "Error al asignar el rol");
      }
    });
  };

  const handleRemoveRole = (userId: string, roleId: string, roleName: string) => {
    const confirmMsg = `¿Remover el rol "${roleName}" del usuario?`;
    if (!window.confirm(confirmMsg)) return;
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("roleId", roleId);
    
    startTransition(async () => {
      const res = await actions.removeUserRole(fd);
      if (res.ok) {
        toast.success(`Rol "${roleName}" removido correctamente`);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: u.roles.filter(r => r.id !== roleId) } : u));
      } else {
        toast.error(res.message ?? "Error al remover el rol");
      }
    });
  };

  // Crear usuario
  const handleCreateUser = (fd: FormData) => {
    if (!actions.createUser) return;
    startTransition(async () => {
      const res = await actions.createUser!(fd);
      if (res.ok) {
        toast.success(res.message ?? "Usuario creado");
        setCreateOpen(false);
        if (res.user) {
          const u = res.user;
          setUsers(prev => [{ id: u.id, email: u.email, displayName: u.displayName, roles: [] }, ...prev]);
        }
      } else {
        toast.error(res.message ?? "No se pudo crear");
      }
    });
  };

  // Editar usuario
  const handleUpdateUser = (fd: FormData) => {
    if (!actions.updateUser || !current) return;
    fd.set("id", current.id);
    startTransition(async () => {
      const res = await actions.updateUser!(fd);
      if (res.ok) {
        toast.success(res.message ?? "Usuario actualizado");
        setEditOpen(false);
        if (res.user) {
          const ru = res.user;
          setUsers(prev => prev.map(u => u.id === ru.id ? { ...u, email: ru.email, displayName: ru.displayName } : u));
        }
      } else {
        toast.error(res.message ?? "No se pudo actualizar");
      }
    });
  };

  // Eliminar usuario
  const handleDeleteUser = () => {
    if (!actions.deleteUser || !current) return;
  if (!window.confirm(`¿Eliminar definitivamente al usuario "${current.email}"?`)) return;
    const fd = new FormData();
    fd.set("id", current.id);
    startTransition(async () => {
      const res = await actions.deleteUser!(fd);
      if (res.ok) {
        toast.success(res.message ?? "Usuario eliminado");
        setUsers(prev => prev.filter(u => u.id !== current.id));
        setDeleteOpen(false);
      } else {
        toast.error(res.message ?? "No se pudo eliminar");
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header con estadísticas */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
                <p className="text-muted-foreground">
                  Gestiona usuarios y sus permisos en el sistema
                </p>
              </div>
            </div>
          </div>
          
          {/* Estadísticas rápidas y acciones */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">{users.length}</span>
              <span className="text-muted-foreground">usuarios</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="font-medium">{users.filter(u => u.roles.length > 0).length}</span>
              <span className="text-muted-foreground">con roles</span>
            </div>
            {canAssign && (
              <Button variant="outline" className="ml-auto" onClick={() => { setCurrent(null); setCreateOpen(true); }}>
                <UserPlus className="h-4 w-4 mr-2" /> Nuevo usuario
              </Button>
            )}
          </div>
        </div>

        {/* Filtros y búsqueda mejorados */}
        <Card className="p-6 border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar usuarios
              </Label>
              <div className="relative">
                <Input
                  placeholder="Buscar por email, nombre o rol..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtrar por rol
              </Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  <SelectItem value="no-roles">Sin roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* Formulario de asignación de roles mejorado */}
      {canAssign && (
        <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
          <div className="border-l-4 border-primary/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Asignar rol por email</h2>
                <p className="text-sm text-muted-foreground">
                  Asigna roles a usuarios existentes o crea nuevos usuarios
                </p>
              </div>
            </div>
            
            <form action={handleAssignRole} className="grid gap-6 lg:grid-cols-4 lg:items-end">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email del usuario
                </Label>
                <Input
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rol a asignar
                </Label>
                <Select value={roleName} onValueChange={setRoleName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.name}</span>
                          {role.description && (
                            <span className="text-xs text-muted-foreground">
                              {role.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                type="submit"
                disabled={isPending || !email || !roleName}
                className="h-10 px-8 transition-all duration-200 hover:scale-105"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Asignando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Asignar Rol
                  </div>
                )}
              </Button>
            </form>
          </div>
        </Card>
    )}

      {/* Tabla de usuarios mejorada */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/30">
              <TableHead className="font-semibold">Usuario</TableHead>
              <TableHead className="font-semibold">Información</TableHead>
              <TableHead className="font-semibold">Roles Asignados</TableHead>
              <TableHead className="w-32 text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user, index) => (
              <TableRow 
                key={user.id} 
                className="group hover:bg-muted/20 transition-colors duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarFallback className={getAvatarColor(user.email)}>
                        {getUserInitials(user.email, user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {user.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell className="py-4">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {user.displayName || "Sin nombre"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.roles.length > 0 
                        ? `${user.roles.length} rol${user.roles.length !== 1 ? 'es' : ''} asignado${user.roles.length !== 1 ? 's' : ''}`
                        : "Sin roles asignados"
                      }
                    </div>
                  </div>
                </TableCell>
                
                <TableCell className="py-4">
                  <div className="flex flex-wrap gap-2 max-w-md">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="secondary"
                          className="group/badge relative pr-8 transition-all duration-200 hover:pr-8 hover:bg-destructive/10 hover:text-destructive border-0 bg-primary/10 text-primary"
                        >
                          <Shield className="mr-2 h-3 w-3" />
                          {role.name}
                          {canAssign && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRole(user.id, role.id, role.name)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full 
                                       opacity-0 group-hover/badge:opacity-100 transition-all duration-200
                                       hover:bg-destructive/20 hover:text-destructive flex items-center justify-center"
                              aria-label={`Remover rol ${role.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-dashed">
                        Sin roles
                      </Badge>
                    )}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  {canAssign && (
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button size="sm" variant="outline" onClick={() => { setCurrent(user); setEditOpen(true); }}>Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => { setCurrent(user); setDeleteOpen(true); }}>
                        <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                      <Users className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-foreground">
                        {q || roleFilter !== "all" ? "No hay coincidencias" : "Aún no hay usuarios"}
                      </h3>
                      <p className="text-sm">
                        {q || roleFilter !== "all" 
                          ? "Intenta ajustar los filtros de búsqueda"
                          : "Los usuarios aparecerán aquí cuando se registren"
                        }
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {/* Modales CRUD Usuario */}
      {canAssign && (
        <>
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
          <DeleteUserModal 
            open={deleteOpen} 
            onOpenChange={setDeleteOpen} 
            user={current} 
            onConfirm={handleDeleteUser} 
            isPending={isPending}
          />
        </>
      )}
    </div>
  );
}

// Modales
function CreateUserModal({ open, onOpenChange, onSubmit, isPending }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (fd: FormData) => void; isPending: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>Crea un nuevo usuario para el sistema</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <UiLabel>Email</UiLabel>
            <Input name="email" type="email" placeholder="usuario@ejemplo.com" required />
          </div>
          <div className="space-y-2">
            <UiLabel>Nombre para mostrar (opcional)</UiLabel>
            <Input name="displayName" placeholder="Nombre del usuario" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Creando..." : "Crear"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserModal({ open, onOpenChange, user, onSubmit, isPending }: { open: boolean; onOpenChange: (v: boolean) => void; user: User | null; onSubmit: (fd: FormData) => void; isPending: boolean }) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");

  // Sync cuando cambia el usuario
  React.useEffect(() => {
    setEmail(user?.email ?? "");
    setDisplayName(user?.displayName ?? "");
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>Actualiza los datos del usuario</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <UiLabel>Email</UiLabel>
            <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <UiLabel>Nombre para mostrar</UiLabel>
            <Input name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserModal({ open, onOpenChange, onConfirm, user, isPending }: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; user: User | null; isPending: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar usuario</DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar al usuario &quot;{user?.email}&quot;? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}