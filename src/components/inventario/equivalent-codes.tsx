"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export type EqCode = { id: string; sistema: string; codigo: string; descripcion?: string | null };

export function EquivalentCodes({ sku, codes, actions }: {
  sku: string;
  codes: EqCode[];
  actions: {
    addEquivalentCode: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    removeEquivalentCode: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  };
}) {
  const [sistema, setSistema] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    if (!sistema || !codigo) {
      toast.error("Completa sistema y código");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("productoId", sku);
      fd.set("sistema", sistema);
      fd.set("codigo", codigo);
      if (descripcion.trim()) fd.set("descripcion", descripcion.trim());
      const r = await actions.addEquivalentCode(fd);
      if (r.ok) {
        toast.success(r.message || "Código agregado");
        setSistema(""); setCodigo(""); setDescripcion("");
      } else {
        toast.error(r.message || "No se pudo agregar");
      }
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (id: string) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("id", id);
      const r = await actions.removeEquivalentCode(fd);
      if (r.ok) toast.success(r.message || "Código eliminado");
      else toast.error(r.message || "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="font-semibold">Códigos equivalentes (ERP)</div>

      {/* Form inline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>Sistema</Label>
          <Input value={sistema} onChange={e=>setSistema(e.target.value)} placeholder="SAP / Odoo / ..." />
        </div>
        <div className="space-y-1">
          <Label>Código</Label>
          <Input value={codigo} onChange={e=>setCodigo(e.target.value)} placeholder="Código externo" />
        </div>
        <div className="space-y-1 md:col-span-1">
          <Label>Descripción (opcional)</Label>
          <Input value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Referencia" />
        </div>
        <div className="flex items-end">
          <Button onClick={onAdd} disabled={busy} className="gap-2">
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="divide-y rounded-md border">
        {codes.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">Sin códigos equivalentes</div>
        )}
        {codes.map(c => (
          <div key={c.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.sistema} • {c.codigo}</div>
              {c.descripcion && <div className="text-sm text-muted-foreground">{c.descripcion}</div>}
            </div>
            <Button variant="ghost" className="text-red-600" onClick={()=>onRemove(c.id)} disabled={busy}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
