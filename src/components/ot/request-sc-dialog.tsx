"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function RequestSCDialog({
  open, onOpenChange, onConfirm
}:{
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  onConfirm: (nota?: string)=>Promise<void>;
}) {
  const [nota, setNota] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar faltante (manual)</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nota (opcional)</Label>
          <Input value={nota} onChange={(e)=> setNota(e.target.value)} placeholder="Razón, urgencia, etc." />
          <div className="text-xs text-muted-foreground">
            Se calcularán los faltantes (plan - emitido - stock) por cada material planificado.
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async ()=>{
            await onConfirm(nota.trim() || undefined);
            onOpenChange(false);
          }}>Crear solicitud</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
