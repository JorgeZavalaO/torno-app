'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';

interface OT {
  id: string;
  codigo: string;
  estado: string;
  prioridad: string;
  cliente?: { nombre: string } | null;
  createdAt: string;
}

interface RecentOTsProps {
  ots: OT[];
  loading: boolean;
}

export default function RecentOTs({ ots, loading }: RecentOTsProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Órdenes de Trabajo Recientes</CardTitle>
        <p className="text-sm text-gray-600">Seguimiento de pedidos y trabajos en proceso</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Cargando órdenes de trabajo...</div>
        ) : (
          <div className="space-y-4">
            {ots.slice(0, 10).map((ot) => (
              <div key={ot.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{ot.codigo}</h3>
                    <p className="text-sm text-gray-600">{ot.cliente?.nombre || 'Cliente desconocido'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getEstadoBadge(ot.estado)}>
                      {ot.estado.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPrioridadBadge(ot.prioridad)}>
                      {ot.prioridad}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Creada: {new Date(ot.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/ot/${ot.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalles
                    </a>
                  </Button>
                </div>
              </div>
            ))}

            {ots.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay órdenes de trabajo activas
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}