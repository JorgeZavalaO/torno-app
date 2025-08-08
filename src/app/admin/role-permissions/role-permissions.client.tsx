"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { grantPermissionToRole, revokePermissionFromRole, setRolePermissions } from "./actions";
import { useMemo, useState } from "react";

type Role = { id: string; name: string; description?: string | null };
type Initial = {
  role: { id: string; name: string; description: string | null } | null;
  permissions: { id: string; code: string; description: string }[];
  assignedIds: string[];
};

export default function RolePermissionsClient({
  roles,
  initial,
  canWrite,
}: {
  roles: Role[];
  initial: Initial;
  canWrite: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [roleId, setRoleId] = useState<string>(initial.role?.id ?? "");
  const [filter, setFilter] = useState("");
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initial.assignedIds));

  // si cambia el role desde el selector, actualizamos la URL (RSC recarga datos en el server)
  function onSelectRole(id: string) {
    const sp = new URLSearchParams(searchParams?.toString());
    if (id) sp.set("roleId", id); else sp.delete("roleId");
    router.push(`/admin/role-permissions?${sp.toString()}`);
  }

  // permisos filtrados por texto
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return initial.permissions;
    return initial.permissions.filter(p =>
      p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [filter, initial.permissions]);

  async function togglePermission(pid: string, nextChecked: boolean) {
    if (!roleId || !canWrite) return;
    const fd = new FormData();
    fd.set("roleId", roleId);
    fd.set("permissionId", pid);

    startTransition(async () => {
      if (nextChecked) {
        await grantPermissionToRole(fd);
        setAssigned(prev => new Set(prev).add(pid));
      } else {
        await revokePermissionFromRole(fd);
        setAssigned(prev => {
          const n = new Set(prev); n.delete(pid); return n;
        });
      }
      // refresca RSC (por si otro usuario modificó en paralelo)
      router.refresh();
    });
  }

  async function saveBulk() {
    if (!roleId || !canWrite) return;
    const fd = new FormData();
    fd.set("roleId", roleId);
    fd.set("permissionIds", [...assigned].join(","));
    startTransition(async () => {
      await setRolePermissions(fd);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-end gap-4">
        <div className="min-w-64">
          <Label>Rol</Label>
          <Select
            value={roleId}
            onValueChange={(v) => { setRoleId(v); onSelectRole(v); }}
          >
            <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
            <SelectContent>
              {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grow">
          <Label>Buscar permiso</Label>
          <Input placeholder="permissions.read, 'leer permisos'…" value={filter} onChange={e => setFilter(e.target.value)} />
        </div>

        {canWrite && (
          <div className="flex gap-2">
            <Button onClick={saveBulk} disabled={isPending || !roleId}>Guardar set</Button>
          </div>
        )}
      </div>

      <Card className="p-4">
        {!roleId ? (
          <div className="text-muted-foreground">Selecciona un rol para continuar.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Asignado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const checked = assigned.has(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        disabled={!canWrite || isPending}
                        onCheckedChange={(val: boolean) => togglePermission(p.id, !!val)}
                        aria-label={`Asignar ${p.code}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell className="text-muted-foreground">{p.description || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No hay permisos que coincidan con el filtro
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
