"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type ClientFormValues = {
  id?: string;
  nombre: string;
  ruc: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  activo: boolean;
};

interface ClientFormProps {
  initial?: Partial<ClientFormValues>;
  onSubmit: (fd: FormData) => Promise<void> | void;
  submitLabel?: string;
  disabled?: boolean;
}

export default function ClientForm({
  initial,
  onSubmit,
  submitLabel = "Guardar",
  disabled = false,
}: ClientFormProps) {
  const [activo, setActivo] = useState<boolean>(initial?.activo ?? true);

  return (
    <form action={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {initial?.id && <input type="hidden" name="id" defaultValue={initial.id} />}

      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input
          id="nombre"
          name="nombre"
          required
          disabled={disabled}
          defaultValue={initial?.nombre ?? ""}
          placeholder="Nombre del cliente"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="ruc">RUC *</Label>
        <Input
          id="ruc"
          name="ruc"
          required
          disabled={disabled}
          defaultValue={initial?.ruc ?? ""}
          placeholder="RUC del cliente"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          disabled={disabled}
          defaultValue={initial?.email ?? ""}
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input
          id="telefono"
          name="telefono"
          disabled={disabled}
          defaultValue={initial?.telefono ?? ""}
          placeholder="Número de teléfono"
        />
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          name="direccion"
          disabled={disabled}
          defaultValue={initial?.direccion ?? ""}
          placeholder="Dirección completa"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactoNombre">Contacto (Nombre)</Label>
        <Input
          id="contactoNombre"
          name="contactoNombre"
          disabled={disabled}
          defaultValue={initial?.contactoNombre ?? ""}
          placeholder="Nombre del contacto"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactoTelefono">Contacto (Teléfono)</Label>
        <Input
          id="contactoTelefono"
          name="contactoTelefono"
          disabled={disabled}
          defaultValue={initial?.contactoTelefono ?? ""}
          placeholder="Teléfono del contacto"
        />
      </div>

      <div className="flex items-center gap-3 md:col-span-2">
        <Switch
          checked={activo}
          onCheckedChange={(v) => setActivo(v)}
          disabled={disabled}
        />
        <input type="hidden" name="activo" value={String(activo)} />
        <Label>Estado: {activo ? "Activo" : "Inactivo"}</Label>
      </div>

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={disabled}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}