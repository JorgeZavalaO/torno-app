"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type ClientFormValues = {
  id?: string;
  nombre: string; ruc: string; email?: string; telefono?: string; direccion?: string;
  contactoNombre?: string; contactoTelefono?: string; activo: boolean;
};

export default function ClienteForm({
  initial, onSubmit, submitLabel = "Guardar",
}: {
  initial?: Partial<ClientFormValues>;
  onSubmit: (fd: FormData) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [activo, setActivo] = useState<boolean>(initial?.activo ?? true);

  return (
    <form action={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {initial?.id && <input type="hidden" name="id" defaultValue={initial.id} />}

      <div className="space-y-1">
        <Label>Nombre *</Label>
        <Input name="nombre" required defaultValue={initial?.nombre ?? ""} />
      </div>
      <div className="space-y-1">
        <Label>RUC *</Label>
        <Input name="ruc" required defaultValue={initial?.ruc ?? ""} />
      </div>

      <div className="space-y-1">
        <Label>Email</Label>
        <Input name="email" type="email" defaultValue={initial?.email ?? ""} />
      </div>
      <div className="space-y-1">
        <Label>Teléfono</Label>
        <Input name="telefono" defaultValue={initial?.telefono ?? ""} />
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label>Dirección</Label>
        <Input name="direccion" defaultValue={initial?.direccion ?? ""} />
      </div>

      <div className="space-y-1">
        <Label>Contacto (Nombre)</Label>
        <Input name="contactoNombre" defaultValue={initial?.contactoNombre ?? ""} />
      </div>
      <div className="space-y-1">
        <Label>Contacto (Teléfono)</Label>
        <Input name="contactoTelefono" defaultValue={initial?.contactoTelefono ?? ""} />
      </div>

      <div className="flex items-center gap-3 md:col-span-2">
        <Switch checked={activo} onCheckedChange={(v) => setActivo(v)} />
        <input type="hidden" name="activo" value={String(activo)} />
        <span>{activo ? "Activo" : "Inactivo"}</span>
      </div>

      <div className="md:col-span-2 justify-end flex">
        <button className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
