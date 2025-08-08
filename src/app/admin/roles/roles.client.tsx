"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Role = { id: string; name: string; description?: string | null };
type Actions = {
  createRole: (fd: FormData) => Promise<void>;
  updateRole: (fd: FormData) => Promise<void>;
  deleteRole: (fd: FormData) => Promise<void>;
};

export default function RolesClient({
  initialItems,
  canWrite,
  actions,
}: {
  initialItems: Role[];
  canWrite: boolean;
  actions: Actions;
}) {
  const [items] = useState<Role[]>(initialItems); // se revalida con server actions (revalidatePath)

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        {canWrite && <CreateDialog onAction={actions.createRole} />}
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
                  <InlineEdit
                    name="name"
                    id={r.id}
                    value={r.name}
                    onAction={actions.updateRole}
                    editable={canWrite}
                  />
                </TableCell>
                <TableCell>
                  <InlineEdit
                    name="description"
                    id={r.id}
                    value={r.description ?? ""}
                    onAction={actions.updateRole}
                    editable={canWrite}
                  />
                </TableCell>
                <TableCell>
                  {canWrite ? (
                    <form action={actions.deleteRole}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button variant="destructive" type="submit">Eliminar</Button>
                    </form>
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

function CreateDialog({ onAction }: { onAction: (fd: FormData) => Promise<void> }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button>Nuevo rol</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Crear rol</DialogTitle></DialogHeader>
        <form action={onAction} className="space-y-4">
          <div className="grid gap-2">
            <Label>Nombre</Label>
            <Input name="name" required />
          </div>
          <div className="grid gap-2">
            <Label>Descripción</Label>
            <Textarea name="description" />
          </div>
          <DialogFooter><Button type="submit">Crear</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InlineEdit({
  id, name, value, onAction, editable,
}: {
  id: string;
  name: "name" | "description";
  value: string;
  onAction: (fd: FormData) => Promise<void>;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  if (!editable) return <span>{value || "-"}</span>;

  return editing ? (
    <form
      action={async (fd) => {
        fd.append("id", id);
        fd.append(name, v);
        await onAction(fd);
        setEditing(false);
      }}
      className="flex gap-2"
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} />
      <Button type="submit">Guardar</Button>
      <Button type="button" variant="secondary" onClick={() => { setV(value); setEditing(false); }}>Cancelar</Button>
    </form>
  ) : (
    <div className="flex items-center gap-2">
      <span>{value || "-"}</span>
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Editar</Button>
    </div>
  );
}
