"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { startTransition } from "react";

export function CreateProviderDialog({ onCreate }: { onCreate: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [ruc, setRuc] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  async function handleSubmit() {
    if (!nombre || nombre.trim().length < 2) return toast.error("Nombre inválido");
    if (!ruc || ruc.trim().length < 8) return toast.error("RUC inválido");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("nombre", nombre.trim());
      fd.set("ruc", ruc.trim());
      if (contacto.trim()) fd.set("contacto", contacto.trim());
      if (email.trim()) fd.set("email", email.trim());
      if (telefono.trim()) fd.set("telefono", telefono.trim());
      const res = await onCreate(fd);
      if (res.ok) {
        toast.success(res.message || "Proveedor creado");
        setOpen(false);
        setNombre(""); setRuc(""); setContacto(""); setEmail(""); setTelefono("");
        // refrescar datos (server actions ya revalidan tags)
        startTransition(() => router.refresh());
      } else {
        toast.error(res.message || "No se pudo crear");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">Nuevo proveedor</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
          <DialogDescription>Registra un proveedor para usarlo en órdenes de compra.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2">
          <div>
            <div className="text-sm text-muted-foreground">Nombre</div>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Razón social" autoFocus />
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creando…" : "Crear"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
