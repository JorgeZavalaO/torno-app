"use client";
import { useTransition, startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit3 } from "lucide-react";
import { toast } from "sonner";
import ClientForm, { type ClientFormValues } from "./ClientForm";
import type { Client } from "./types";

interface ClientModalProps {
  mode: "create" | "edit";
  action: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  initial?: Partial<ClientFormValues>;
  trigger?: React.ReactNode;
  onClientCreated?: (client: Client) => void;
  onClientUpdated?: (client: Client) => void;
}

export default function ClientModal({
  mode,
  action,
  initial,
  trigger,
  onClientCreated,
  onClientUpdated,
}: ClientModalProps) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const title = mode === "create" ? "Nuevo Cliente" : "Editar Cliente";

  const handleSubmit = (fd: FormData) =>
    start(async () => {
      try {
        const res = await action(fd);
        if (res.ok) {
          toast.success(res.message ?? "Cliente guardado correctamente");
          setOpen(false);
          
          // Actualizar el estado local si hay callbacks disponibles
          if (mode === "create" && onClientCreated) {
            // Para creación, necesitamos obtener el cliente recién creado
            // Como las acciones no devuelven el cliente, refrescamos la página
            startTransition(() => router.refresh());
          } else if (mode === "edit" && onClientUpdated) {
            // Para edición, intentamos obtener el cliente actualizado
            const clientId = fd.get("id") as string;
            if (clientId) {
              try {
                const response = await fetch(`/api/clients/${clientId}`);
                if (response.ok) {
                  const updatedClient = await response.json();
                  onClientUpdated(updatedClient);
                } else {
                  // Si falla, refrescamos la página
                  startTransition(() => router.refresh());
                }
              } catch {
                // Si falla, refrescamos la página
                startTransition(() => router.refresh());
              }
            } else {
              startTransition(() => router.refresh());
            }
          } else {
            // Fallback: refrescar la página
            startTransition(() => router.refresh());
          }
        } else {
          toast.error(res.message ?? "Error al guardar cliente");
        }
      } catch (error) {
        console.error("Error en acción de cliente:", error);
        toast.error("Error inesperado al guardar cliente");
      }
    });

  const defaultTrigger = (
    <Button
      variant={mode === "create" ? "default" : "ghost"}
      size="sm"
      className="gap-2"
    >
      {mode === "create" ? <Plus className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
      {mode === "create" ? "Nuevo Cliente" : "Editar"}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ClientForm
          initial={initial}
          onSubmit={handleSubmit}
          submitLabel={pending ? "Guardando..." : "Guardar"}
          disabled={pending}
        />
      </DialogContent>
    </Dialog>
  );
}