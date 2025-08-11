"use client";

import { memo, useDeferredValue, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import ClienteModal from "./cliente-modal";
import ImportModal from "./import-modal";

type Client = {
  id: string; nombre: string; ruc: string; email?: string | null; telefono?: string | null;
  direccion?: string | null; contactoNombre?: string | null; contactoTelefono?: string | null;
  activo: boolean;
};

type Actions = {
  createClient: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  updateClient: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  deleteClient: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  importClients: (file: File) => Promise<{ ok: boolean; message?: string }>;
};

export default function ClientesClient({
  initialItems, canWrite, actions,
}: { initialItems: Client[]; canWrite: boolean; actions: Actions }) {
  const [items, setItems] = useState<Client[]>(initialItems);
  const [q, setQ] = useState("");

  // Defer del input para evitar bloques de UI en listas grandes
  const dq = useDeferredValue(q);

  const filtered = useMemo(() => {
    const s = dq.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) =>
      [c.nombre, c.ruc, c.email ?? "", c.telefono ?? ""].some((v) => v.toLowerCase().includes(s))
    );
  }, [dq, items]);

  const handleDeleted = (id: string) => setItems(prev => prev.filter(c => c.id !== id));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Lista de Clientes</h1>
        <div className="flex gap-2">
          {canWrite && <ImportModal onImported={() => window.location.reload()} importAction={actions.importClients} />}
          {canWrite && <ClienteModal mode="create" action={actions.createClient} />}
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-3 max-w-lg">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar clientes por nombre, RUC, email, teléfono..." />
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Cliente</TableHead>
              <TableHead>RUC</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <Row key={c.id} c={c} canWrite={canWrite} actions={actions} onDeleted={handleDeleted} />
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  {q ? "Sin resultados para tu búsqueda" : "No hay clientes registrados"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const Row = memo(function Row({
  c, canWrite, actions, onDeleted,
}: {
  c: Client; canWrite: boolean; actions: Actions;
  onDeleted: (id: string) => void;
}) {
  const [isPending, start] = useTransition();

  const doDelete = () => {
    if (!confirm(`Eliminar cliente "${c.nombre}"?`)) return;
    const fd = new FormData(); fd.set("id", c.id);
    start(async () => {
      const res = await actions.deleteClient(fd);
      if (res.ok) {
        toast.success(res.message ?? "Eliminado");
        onDeleted(c.id);
      } else {
        toast.error(res.message ?? "Error");
      }
    });
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{c.nombre}</div>
        <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
      </TableCell>
      <TableCell>{c.ruc}</TableCell>
      <TableCell>{c.contactoNombre ?? "—"}</TableCell>
      <TableCell>{c.telefono ?? "—"}</TableCell>
      <TableCell>
        <Badge className={c.activo ? "" : "bg-muted text-foreground"}>{c.activo ? "Activo" : "Inactivo"}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {canWrite && (
          <>
            <ClienteModal
              mode="edit"
              action={actions.updateClient}
              initial={{
                ...c,
                email: c.email ?? undefined,
                telefono: c.telefono ?? undefined,
                direccion: c.direccion ?? undefined,
                contactoNombre: c.contactoNombre ?? undefined,
                contactoTelefono: c.contactoTelefono ?? undefined,
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={doDelete}
              disabled={isPending}
              className="text-destructive"
              aria-label={`Eliminar cliente ${c.nombre}`}
              title={`Eliminar cliente ${c.nombre}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
});
