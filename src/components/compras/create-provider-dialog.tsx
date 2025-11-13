"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Building2 } from "lucide-react";

export function CreateProviderDialog({ onCreate, monedaOptions, defaultCurrency }: { onCreate: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>; monedaOptions: { value: string; label: string; color?: string | null }[]; defaultCurrency?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [ruc, setRuc] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency || "PEN");

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
      if (direccion.trim()) fd.set("direccion", direccion.trim());
      fd.set("currency", currency);
      const res = await onCreate(fd);
      if (res.ok) {
        toast.success(res.message || "Proveedor creado");
        setOpen(false);
        setNombre(""); setRuc(""); setContacto(""); setEmail(""); setTelefono("");setDireccion(""); setCurrency(defaultCurrency || "PEN");
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
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <DialogTitle>Nuevo proveedor</DialogTitle>
              <DialogDescription>Registra un proveedor para usarlo en órdenes de compra.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
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
          <div>
            <div className="text-sm text-muted-foreground">Dirección (opcional)</div>
            <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle 123, Ciudad" />
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
          <div>
            <div className="text-sm text-muted-foreground">Moneda preferida</div>
            <select
              className="border rounded-md h-9 px-2 w-full"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {monedaOptions.map(m => (
                <option key={m.value} value={m.value}>{m.value} — {m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white" onClick={handleSubmit} disabled={loading}>
            {loading ? <>Creando…</> : <><Building2 className="h-4 w-4" />Crear</> }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
