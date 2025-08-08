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

type Perm = { id: string; code: string; description?: string | null };

export default function PermissionsClient({ initialItems, canWrite }: { initialItems: Perm[]; canWrite: boolean }) {
  const [items, setItems] = useState<Perm[]>(initialItems);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function refresh() {
    const r = await fetch("/api/permissions", { cache: "no-store" });
    setItems(await r.json());
    router.refresh();
  }

  async function createItem(fd: FormData) {
    const body = Object.fromEntries(fd) as Record<string, unknown>;
    await fetch("/api/permissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setOpen(false);
    await refresh();
  }

  async function updateItem(id: string, patch: Partial<Perm>) {
    await fetch(`/api/permissions/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    await refresh();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/permissions/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Permisos</h1>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Nuevo permiso</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear permiso</DialogTitle></DialogHeader>
              <form action={async (fd) => createItem(fd)} className="space-y-4">
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
        )}
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
                  <InlineEdit value={p.code} onSave={(v) => updateItem(p.id, { code: v })} editable={canWrite} />
                </TableCell>
                <TableCell>
                  <InlineEdit value={p.description ?? ""} onSave={(v) => updateItem(p.id, { description: v })} editable={canWrite} />
                </TableCell>
                <TableCell>
                  {canWrite ? (
                    <Button variant="destructive" onClick={() => deleteItem(p.id)}>Eliminar</Button>
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
