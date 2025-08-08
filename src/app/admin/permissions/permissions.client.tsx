"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Perm = { id: string; code: string; description?: string | null };
type Actions = {
  createPermission: (fd: FormData) => Promise<void>;
  updatePermission: (fd: FormData) => Promise<void>;
  deletePermission: (fd: FormData) => Promise<void>;
};

export default function PermissionsClient({
  initialItems,
  canWrite,
  actions,
}: {
  initialItems: Perm[];
  canWrite: boolean;
  actions: Actions;
}) {
  const [items] = useState<Perm[]>(initialItems);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Permisos</h1>
        {canWrite && <CreateDialog onAction={actions.createPermission} />}
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-48">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <InlineEdit id={p.id} name="code" value={p.code} onAction={actions.updatePermission} editable={canWrite} />
                </TableCell>
                <TableCell>
                  <InlineEdit id={p.id} name="description" value={p.description ?? ""} onAction={actions.updatePermission} editable={canWrite} />
                </TableCell>
                <TableCell>
                  {canWrite ? (
                    <form action={actions.deletePermission}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button variant="destructive" type="submit">Eliminar</Button>
                    </form>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin permisos</TableCell></TableRow>
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
      <DialogTrigger asChild><Button>Nuevo permiso</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Crear permiso</DialogTitle></DialogHeader>
        <form action={onAction} className="space-y-4">
          <div className="grid gap-2">
            <Label>Código</Label>
            <Input name="code" placeholder="orders.read" required />
          </div>
          <div className="grid gap-2">
            <Label>Descripción</Label>
            <Textarea name="description" placeholder="Puede leer pedidos" />
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
  name: "code" | "description";
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
