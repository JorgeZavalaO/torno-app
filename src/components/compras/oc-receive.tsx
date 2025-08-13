"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function OCReceive({ onReceive }: { onReceive: (facturaUrl?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  return (
    <>
      {!open ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          Recepcionar
        </Button>
      ) : (
        <Card className="p-3 space-y-2">
          <div className="text-sm text-muted-foreground">URL de factura (opcional)</div>
          <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => onReceive(url || undefined)}>
              Confirmar
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
