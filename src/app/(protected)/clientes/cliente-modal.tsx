"use client";
import { useTransition, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit3 } from "lucide-react";
import { toast } from "sonner";
import ClienteForm, { ClientFormValues } from "./cliente-form";

export default function ClienteModal({
  mode, action, initial,
}: {
  mode: "create" | "edit";
  action: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  initial?: Partial<ClientFormValues>;
}) {
  const [pending, start] = useTransition();
  const title = mode === "create" ? "Nuevo Cliente" : "Editar Cliente";

  const router = useRouter();
  const onSubmit = (fd: FormData) =>
    start(async () => {
      const res = await action(fd);
      if (res.ok) {
        toast.success(res.message ?? "Guardado");
        startTransition(() => router.refresh());
      } else {
        toast.error(res.message ?? "Error");
      }
    });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={mode === "create" ? "default" : "ghost"} size="sm" className="gap-2">
          {mode === "create" ? <Plus className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
          {mode === "create" ? "Nuevo" : "Editar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <ClienteForm initial={initial} onSubmit={onSubmit} submitLabel={pending ? "Guardando..." : "Guardar"} />
      </DialogContent>
    </Dialog>
  );
}
