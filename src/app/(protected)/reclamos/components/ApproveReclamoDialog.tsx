'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Reclamo {
  id: string;
  titulo: string;
}

interface ApproveReclamoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reclamo: Reclamo | null;
  onApprove: (tipoResolucion: string, notasResolucion: string) => void;
}

export default function ApproveReclamoDialog({
  open,
  onOpenChange,
  reclamo,
  onApprove
}: ApproveReclamoDialogProps) {
  const [tipoResolucion, setTipoResolucion] = useState('');
  const [notasResolucion, setNotasResolucion] = useState('');

  useEffect(() => {
    if (!open) {
      setTipoResolucion('');
      setNotasResolucion('');
    }
  }, [open]);

  const handleApprove = () => {
    if (tipoResolucion) {
      onApprove(tipoResolucion, notasResolucion);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar Reclamo</DialogTitle>
          <p className="text-sm text-gray-600">
            Selecciona el tipo de resolución para el reclamo: <strong>{reclamo?.titulo}</strong>
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo de Resolución</label>
            <Select value={tipoResolucion || "__none"} onValueChange={(value) => {
              if (value === "__none") {
                setTipoResolucion('');
              } else {
                setTipoResolucion(value);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona resolución" />
              </SelectTrigger>
              <SelectContent>
                {tipoResolucion === '' && <SelectItem value="__none">Selecciona resolución</SelectItem>}
                <SelectItem value="OT_PENDIENTE">Regresar OT a pendiente</SelectItem>
                <SelectItem value="OT_NUEVA">Crear nueva OT</SelectItem>
                <SelectItem value="REEMBOLSO">Reembolso al cliente</SelectItem>
                <SelectItem value="AJUSTE_STOCK">Ajuste en inventario</SelectItem>
                <SelectItem value="OTRO">Otra resolución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Notas de Resolución (opcional)</label>
            <Textarea
              value={notasResolucion}
              onChange={(e) => setNotasResolucion(e.target.value)}
              placeholder="Detalles adicionales sobre la resolución..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!tipoResolucion}
            >
              Aprobar Reclamo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}