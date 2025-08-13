"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Actions, Provider } from "./types";

export function ProvidersList({ providers, actions }: { providers: Provider[]; actions?: Pick<Actions, "updateProvider" | "deleteProvider"> }) {
  const [editing, setEditing] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(false);

  async function onDelete(id: string) {
    if (!actions?.deleteProvider) return;
    if (!confirm("¿Eliminar este proveedor? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    const r = await actions.deleteProvider(id);
    setLoading(false);
    if (r.ok) {
      toast.success(r.message || "Proveedor eliminado");
      location.reload();
    } else toast.error(r.message);
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Nombre</TableHead>
            <TableHead>RUC</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            {actions && <TableHead className="text-center">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.nombre}</TableCell>
              <TableCell className="font-mono">{p.ruc}</TableCell>
              <TableCell>{p.email ?? "—"}</TableCell>
              <TableCell>{p.telefono ?? "—"}</TableCell>
              {actions && (
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Editar</Button>
                    <Button size="sm" variant="destructive" disabled={loading} onClick={() => onDelete(p.id)}>Eliminar</Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {providers.length === 0 && (
            <TableRow>
              <TableCell colSpan={actions ? 5 : 4} className="py-10 text-center text-muted-foreground">
                Sin proveedores
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <EditProviderDialog
        provider={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (payload) => {
          if (!actions?.updateProvider) return;
          const fd = new FormData();
          fd.set("id", payload.id);
          if (payload.nombre !== undefined) fd.set("nombre", payload.nombre);
          if (payload.ruc !== undefined) fd.set("ruc", payload.ruc);
          if (payload.contacto !== undefined) fd.set("contacto", payload.contacto);
          if (payload.email !== undefined) fd.set("email", payload.email);
          if (payload.telefono !== undefined) fd.set("telefono", payload.telefono);
          const r = await actions.updateProvider(fd);
          if (r.ok) {
            toast.success(r.message || "Proveedor actualizado");
            location.reload();
          } else toast.error(r.message);
        }}
      />
    </Card>
  );
}

type ProviderWithOptionalContact = Provider & { contacto?: string | null };

function EditProviderDialog({ provider, onOpenChange, onSubmit }: {
  provider: ProviderWithOptionalContact | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { id: string; nombre?: string; ruc?: string; contacto?: string; email?: string; telefono?: string }) => void;
}) {
  const [nombre, setNombre] = useState(provider?.nombre ?? "");
  const [ruc, setRuc] = useState(provider?.ruc ?? "");
  const [contacto, setContacto] = useState(provider?.contacto ?? "");
  const [email, setEmail] = useState(provider?.email ?? "");
  const [telefono, setTelefono] = useState(provider?.telefono ?? "");

  useEffect(() => {
    setNombre(provider?.nombre ?? "");
    setRuc(provider?.ruc ?? "");
    setContacto(provider?.contacto ?? "");
    setEmail(provider?.email ?? "");
    setTelefono(provider?.telefono ?? "");
  }, [provider]);

  const open = !!provider;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar proveedor</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2">
          <div>
            <div className="text-sm text-muted-foreground">Nombre</div>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Razón social" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">RUC</div>
            <Input value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="RUC" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Contacto (opcional)</div>
            <Input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Nombre del contacto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Email (opcional)</div>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@proveedor.com" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Teléfono (opcional)</div>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 999 999 999" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSubmit({ id: provider!.id, nombre, ruc, contacto, email, telefono })}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
