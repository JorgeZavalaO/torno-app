'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, ArrowRight, Eye } from 'lucide-react';

interface Reclamo {
  id: string;
  codigo?: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  categoria?: string;
  tipoReclamo: string;
  otReferenciaId?: string;
  tipoResolucion?: string;
  createdAt: string;
  cliente?: {
    id: string;
    nombre: string;
  } | null;
  otReferencia?: {
    id: string;
    codigo: string;
  };
}

interface ReclamosListProps {
  reclamos: Reclamo[];
  loading: boolean;
  canApprove: boolean;
  onViewDetail: (reclamo: Reclamo) => void;
  onEstadoChange?: (reclamoId: string, nuevoEstado: string, tipoResolucion?: string, notasResolucion?: string) => void;
  onConvertToOT: (reclamoId: string) => void;
  onApprove: (reclamo: Reclamo) => void;
  onReject: (reclamo: Reclamo) => void;
}

export default function ReclamosList({
  reclamos,
  loading,
  canApprove,
  onViewDetail,
  onConvertToOT,
  onApprove,
  onReject
}: ReclamosListProps) {
  const getEstadoBadge = (estado: string) => {
    const variants = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED_TO_OT: 'bg-purple-100 text-purple-800',
    };
    return variants[estado as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getPrioridadBadge = (prioridad: string) => {
    const variants = {
      BAJA: 'bg-gray-100 text-gray-800',
      MEDIA: 'bg-yellow-100 text-yellow-800',
      ALTA: 'bg-orange-100 text-orange-800',
      URGENTE: 'bg-red-100 text-red-800',
    };
    return variants[prioridad as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reclamos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reclamos ({reclamos.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reclamos.map((reclamo) => (
            <div key={reclamo.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-base">{reclamo.titulo}</h3>
                    <Badge className={getPrioridadBadge(reclamo.prioridad)}>
                      {reclamo.prioridad}
                    </Badge>
                    <Badge className={getEstadoBadge(reclamo.estado)}>
                      {reclamo.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{reclamo.cliente?.nombre || 'Cliente desconocido'}</p>
                  <p className="text-xs text-gray-500 mt-1">{reclamo.descripcion.substring(0, 100)}...</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetail(reclamo)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
              </div>

              <div className="flex justify-between items-center mb-3 pt-2 border-t">
                <div className="flex gap-4 text-xs text-gray-500">
                  {reclamo.codigo && (
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {reclamo.codigo}
                    </span>
                  )}
                  <span>Creado: {new Date(reclamo.createdAt).toLocaleDateString()}</span>
                  <span>Tipo: {reclamo.tipoReclamo.replace('_', ' ')}</span>
                  {reclamo.otReferencia && (
                    <span className="text-purple-600">OT Ref: {reclamo.otReferencia.codigo}</span>
                  )}
                </div>
              </div>

              {canApprove && (
                <div className="flex gap-2 flex-wrap">
                  {reclamo.estado === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onApprove(reclamo)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject(reclamo)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </>
                  )}
                  {reclamo.estado === 'APPROVED' && reclamo.tipoResolucion === 'OT_NUEVA' && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => onConvertToOT(reclamo.id)}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Crear OT
                    </Button>
                  )}
                  {reclamo.estado === 'APPROVED' && !reclamo.tipoResolucion && (
                    <div className="text-sm text-gray-600 italic">Esperando definir resolución</div>
                  )}
                  {reclamo.estado === 'UNDER_REVIEW' && (
                    <div className="text-sm text-blue-600">En revisión...</div>
                  )}
                  {reclamo.estado === 'REJECTED' && (
                    <div className="text-sm text-red-600">Rechazado</div>
                  )}
                  {reclamo.estado === 'CONVERTED_TO_OT' && (
                    <div className="text-sm text-green-600">✓ Convertido a OT</div>
                  )}
                </div>
              )}
            </div>
          ))}

          {reclamos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No se encontraron reclamos</p>
              <p className="text-sm mt-2">Crea uno nuevo con el botón Nuevo Reclamo</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}