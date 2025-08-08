"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Role = { id: string; name: string; description?: string | null };
export default function RolesClient({ initialItems, canWrite }: { initialItems: Role[]; canWrite: boolean }) {
  const [items, setItems] = useState<Role[]>(initialItems);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function refresh() {
    const r = await fetch("/api/roles", { cache: "no-store" });
    setItems(await r.json());
    router.refresh();
  }

  async function createRole(formData: FormData) {
    const body = Object.fromEntries(formData) as Record<string, unknown>;
    await fetch("/api/roles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setOpen(false);
    await refresh();
  }

  async function updateRole(id: string, patch: Partial<Role>) {
    await fetch(`/api/roles/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    await refresh();
  }

  async function deleteRole(id: string) {
    await fetch(`/api/roles/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Nuevo rol</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear rol</DialogTitle></DialogHeader>
              <form action={async (fd) => createRole(fd)} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Nombre</Label>
                  <Input name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label>Descripción</Label>
                  <Textarea name="description" />
                </div>
                <DialogFooter>
                  <Button type="submit">Crear</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-48">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <InlineEdit value={r.name} onSave={(v) => updateRole(r.id, { name: v })} editable={canWrite} />
                </TableCell>
                <TableCell>
                  <InlineEdit value={r.description ?? ""} onSave={(v) => updateRole(r.id, { description: v })} editable={canWrite} />
                </TableCell>
                <TableCell>
                  {canWrite ? (
                    <Button variant="destructive" onClick={() => deleteRole(r.id)}>Eliminar</Button>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin roles</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function InlineEdit({ value, onSave, editable }: { value: string; onSave: (v: string) => void; editable: boolean }) {
  const [v, setV] = useState(value);
  const [editing, setEditing] = useState(false);
  if (!editable) return <span>{value || "-"}</span>;
  return editing ? (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} />
      <Button onClick={() => { onSave(v); setEditing(false); }}>Guardar</Button>
      <Button variant="secondary" onClick={() => { setV(value); setEditing(false); }}>Cancelar</Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <span>{value || "-"}</span>
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Editar</Button>
    </div>
  );
}
