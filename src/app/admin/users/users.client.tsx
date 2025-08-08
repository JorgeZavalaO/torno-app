"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = { id: string; name: string; description?: string | null };
type User = { id: string; email: string; displayName?: string | null; roles: { id: string; name: string }[] };
type Actions = {
  assignRoleToUser: (fd: FormData) => Promise<void>;
  removeUserRole: (fd: FormData) => Promise<void>;
};

export default function UsersClient({
  initialUsers,
  roles,
  canAssign,
  actions,
}: {
  initialUsers: User[];
  roles: Role[];
  canAssign: boolean;
  actions: Actions;
}) {
  const [users] = useState<User[]>(initialUsers);
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState<string>();

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
      </div>

      {canAssign && (
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">Asignar rol por email</h2>
          <form action={async (fd) => {
            if (email && roleName) {
              fd.set("email", email);
              fd.set("roleName", roleName);
              await actions.assignRoleToUser(fd);
              setEmail("");
              setRoleName(undefined);
            }
          }} className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input placeholder="usuario@dominio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select value={roleName} onValueChange={setRoleName}>
                <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r: Role) => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Asignar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-40">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.displayName ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {u.roles.length ? u.roles.map((r) => (
                      <form
                        key={r.id}
                        action={async (fd) => {
                          fd.set("userId", u.id);
                          fd.set("roleId", r.id);
                          await actions.removeUserRole(fd);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                      >
                        {r.name}
                        {canAssign && (
                          <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${r.name}`}>×</button>
                        )}
                      </form>
                    )) : <span className="text-muted-foreground">Sin roles</span>}
                  </div>
                </TableCell>
                <TableCell><span className="text-muted-foreground">—</span></TableCell>
              </TableRow>
            ))}
            {!users.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Aún no hay usuarios
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
