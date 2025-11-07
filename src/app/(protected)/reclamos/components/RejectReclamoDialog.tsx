'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Reclamo {
  id: string;
  titulo: string;
}

interface RejectReclamoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reclamo: Reclamo | null;
  onRejectConfirm: (motivo: string) => void;
}

export default function RejectReclamoDialog({ open, onOpenChange, reclamo, onRejectConfirm }: RejectReclamoDialogProps) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!open) setMotivo('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar Reclamo</DialogTitle>
          <p className="text-sm text-gray-600">
            Indica el motivo del rechazo para el reclamo: <strong>{reclamo?.titulo}</strong>
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Motivo del rechazo</label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe brevemente el motivo del rechazo"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => { onRejectConfirm(motivo.trim()); onOpenChange(false); }}
              disabled={motivo.trim().length === 0}
            >
              Rechazar reclamo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
