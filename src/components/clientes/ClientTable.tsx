"use client";
import { memo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, FileText } from "lucide-react";
import ClientModal from "./ClientModal";
import type { Client, ClientActions } from "./types";

interface ClientTableProps {
  clients: Client[];
  canWrite: boolean;
  actions: ClientActions;
  onDeleted: (id: string) => void;
  onClientCreated: (client: Client) => void;
  onClientUpdated: (client: Client) => void;
  onOpenQuotes: (client: Client) => void;
}

export default function ClientTable({
  clients,
  canWrite,
  actions,
  onDeleted,
  onClientCreated,
  onClientUpdated,
  onOpenQuotes,
}: ClientTableProps) {
  return (
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
        {clients.map((client) => (
          <ClientRow
            key={client.id}
            client={client}
            canWrite={canWrite}
            actions={actions}
            onDeleted={onDeleted}
            onClientCreated={onClientCreated}
            onClientUpdated={onClientUpdated}
            onOpenQuotes={onOpenQuotes}
          />
        ))}
        {clients.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
              No hay clientes registrados
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

const ClientRow = memo(function ClientRow({
  client,
  canWrite,
  actions,
  onDeleted,
  onClientCreated,
  onClientUpdated,
  onOpenQuotes,
}: {
  client: Client;
  canWrite: boolean;
  actions: ClientActions;
  onDeleted: (id: string) => void;
  onClientCreated: (client: Client) => void;
  onClientUpdated: (client: Client) => void;
  onOpenQuotes: (client: Client) => void;
}) {
  const [isPending, start] = useTransition();

  const handleDelete = () => {
    if (!confirm(`¿Eliminar cliente "${client.nombre}"?`)) return;

    const fd = new FormData();
    fd.set("id", client.id);

    start(async () => {
      try {
        const res = await actions.deleteClient(fd);
        if (res.ok) {
          toast.success(res.message ?? "Cliente eliminado correctamente");
          onDeleted(client.id);
        } else {
          toast.error(res.message ?? "Error al eliminar cliente");
        }
      } catch (error) {
        console.error("Error al eliminar cliente:", error);
        toast.error("Error inesperado al eliminar cliente");
      }
    });
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{client.nombre}</div>
        <div className="text-xs text-muted-foreground">
          {client.email || "Sin email"}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{client.ruc}</TableCell>
      <TableCell>{client.contactoNombre || "—"}</TableCell>
      <TableCell>{client.telefono || "—"}</TableCell>
      <TableCell>
        <Badge
          variant={client.activo ? "default" : "secondary"}
          className={client.activo ? "" : "bg-muted text-foreground"}
        >
          {client.activo ? "Activo" : "Inactivo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {canWrite && (
            <>
              <ClientModal
                mode="edit"
                action={actions.updateClient}
                initial={{
                  ...client,
                  email: client.email ?? undefined,
                  telefono: client.telefono ?? undefined,
                  direccion: client.direccion ?? undefined,
                  contactoNombre: client.contactoNombre ?? undefined,
                  contactoTelefono: client.contactoTelefono ?? undefined,
                }}
                onClientUpdated={onClientUpdated}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenQuotes(client)}
                aria-label={`Ver cotizaciones de ${client.nombre}`}
                title={`Ver cotizaciones de ${client.nombre}`}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="text-destructive hover:text-destructive"
                aria-label={`Eliminar cliente ${client.nombre}`}
                title={`Eliminar cliente ${client.nombre}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});