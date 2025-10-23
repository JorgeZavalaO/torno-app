'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface Cliente {
  id: string;
  nombre: string;
}

interface ReclamosFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  estadoFilter: string;
  onEstadoFilterChange: (value: string) => void;
  clienteFilter: string;
  onClienteFilterChange: (value: string) => void;
  clientes: Cliente[];
}

export default function ReclamosFilters({
  search,
  onSearchChange,
  estadoFilter,
  onEstadoFilterChange,
  clienteFilter,
  onClienteFilterChange,
  clientes
}: ReclamosFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Filtros y Búsqueda</CardTitle>
          <p className="text-xs text-gray-500 mt-1">Busca por: título, descripción, código de reclamo (REC-2025-0001) o código de OT</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por titulo, descripcion, codigo (REC-XXXX) o codigo OT..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                title="Puedes buscar por: título, descripción, código de reclamo (REC-2025-0001) u OT asociada"
              />
            </div>
          </div>
          <Select
            value={clienteFilter}
            onValueChange={(value) => {
              if (value === '__clear') {
                onClienteFilterChange('');
              } else {
                onClienteFilterChange(value);
              }
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              {clienteFilter && <SelectItem value="__clear">Limpiar filtro</SelectItem>}
              {clientes.filter(cliente => cliente.id && cliente.nombre).map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={estadoFilter || "__none"}
            onValueChange={(value) => {
              if (value === "__none") {
                onEstadoFilterChange('');
              } else {
                onEstadoFilterChange(value);
              }
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {!estadoFilter && <SelectItem value="__none">Todos</SelectItem>}
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="UNDER_REVIEW">En Revisión</SelectItem>
              <SelectItem value="APPROVED">Aprobado</SelectItem>
              <SelectItem value="REJECTED">Rechazado</SelectItem>
              <SelectItem value="CONVERTED_TO_OT">Convertido a OT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}