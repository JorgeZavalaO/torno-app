"use client";

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
import { toast } from "sonner"

type Perm = { id: string; code: string; description?: string | null };
type Actions = {
  createPermission: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  updatePermission: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  deletePermission: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function PermissionsClient({
  initialItems, canWrite, actions,
}: { initialItems: Perm[]; canWrite: boolean; actions: Actions }) {
  const [items] = useState<Perm[]>(initialItems);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(p =>
      p.code.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Permisos</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <Input placeholder="Buscar por código o descripción…" value={query} onChange={e => setQuery(e.target.value)} />
          {canWrite && <CreateDialog onAction={actions.createPermission} />}
        </div>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-48 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <Row key={p.id} item={p} canWrite={canWrite} actions={actions} />
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  {query ? "No hay coincidencias con tu búsqueda" : "Sin permisos"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Row({ item, canWrite, actions }: { item: Perm; canWrite: boolean; actions: Actions }) {

  const [editingCode, setEditingCode] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [code, setCode] = useState(item.code);
  const [description, setDescription] = useState(item.description ?? "");
  const [isPending, startTransition] = useTransition();

  async function save(partial: "code" | "description") {
    const fd = new FormData();
    fd.set("id", item.id);
    if (partial === "code") fd.set("code", code);
    if (partial === "description") fd.set("description", description);
    startTransition(async () => {
      const res = await actions.updatePermission(fd);
      toast(res.message ?? (res.ok ? "Guardado" : "Error"));
      setEditingCode(false);
      setEditingDesc(false);
    });
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar el permiso "${item.code}"?`)) return;
    const fd = new FormData();
    fd.set("id", item.id);
    const res = await actions.deletePermission(fd);
    toast(res.message ?? (res.ok ? "Eliminado" : "Error"));
  }

  return (
    <TableRow>
      <TableCell>
        {canWrite ? (
          editingCode ? (
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
              <Button size="sm" onClick={() => save("code")} disabled={isPending}>Guardar</Button>
              <Button size="sm" variant="secondary" onClick={() => { setCode(item.code); setEditingCode(false); }}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.code}</span>
              <Button variant="ghost" size="sm" onClick={() => setEditingCode(true)} aria-label="Editar código">Editar</Button>
            </div>
          )
        ) : <span className="font-medium">{item.code}</span>}
      </TableCell>
      <TableCell>
        {canWrite ? (
          editingDesc ? (
            <div className="flex gap-2">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button size="sm" onClick={() => save("description")} disabled={isPending}>Guardar</Button>
              <Button size="sm" variant="secondary" onClick={() => { setDescription(item.description ?? ""); setEditingDesc(false); }}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{item.description || "—"}</span>
              <Button variant="ghost" size="sm" onClick={() => setEditingDesc(true)} aria-label="Editar descripción">Editar</Button>
            </div>
          )
        ) : <span className="text-muted-foreground">{item.description || "—"}</span>}
      </TableCell>
      <TableCell className="text-right">
        {canWrite ? (
          <Button variant="destructive" size="sm" onClick={onDelete}>Eliminar</Button>
        ) : <span className="text-muted-foreground">—</span>}
      </TableCell>
    </TableRow>
  );
}

function CreateDialog({ onAction }: { onAction: Actions["createPermission"] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild><Button>Nuevo permiso</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Crear permiso</DialogTitle></DialogHeader>
        <form
          action={(fd) => {
            startTransition(async () => {
              const res = await onAction(fd);
              toast(res.message ?? (res.ok ? "Creado" : "Error"));
            });
          }}
          className="space-y-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="code">Código</Label>
            <Input id="code" name="code" placeholder="permissions.read" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" placeholder="Puede leer permisos" />
          </div>
          <DialogFooter><Button type="submit" disabled={isPending}>Crear</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
