"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Wrench, Activity, AlertTriangle, Clock, DollarSign } from "lucide-react";

type MachineRow = {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  estado: "ACTIVA" | "MANTENIMIENTO" | "BAJA";
  ubicacion?: string | null;
  horasUlt30d: number;
  pendMant: number;
  ultimoEvento?: { tipo: string; inicio: string | Date | null } | null;
  // Nuevas métricas
  paradasPorFallas30d: number;
  averias30d: number;
  horasParaSigMant: number | null;
  costoMant30d: number;
};

interface MachinesTableProps {
  machines: MachineRow[];
  canWrite: boolean;
  onEdit: (machine: MachineRow) => void;
  onDelete: (id: string) => void;
  statusOptions?: { value: string; label: string; color?: string | null }[];
}

const getStatusBadge = (estado: MachineRow["estado"], statusOptions?: { value: string; label: string; color?: string | null }[]) => {
  const match = statusOptions?.find(o => o.value === estado);
  if (match) {
    const style = match.color ? { backgroundColor: `${match.color}22`, color: match.color } : undefined;
    return <Badge style={style}>{match.label}</Badge>;
  }
  switch (estado) {
    case "ACTIVA":
      return <Badge variant="default" className="bg-green-100 text-green-800">Activa</Badge>;
    case "MANTENIMIENTO":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Mantenimiento</Badge>;
    case "BAJA":
      return <Badge variant="outline" className="bg-red-100 text-red-800">Baja</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
};

const getUsageIcon = (hours: number) => {
  if (hours > 160) return <span title="Alto uso"><Activity className="h-4 w-4 text-green-600" /></span>;
  if (hours > 80) return <span title="Uso medio"><Activity className="h-4 w-4 text-yellow-600" /></span>;
  return <span title="Bajo uso"><Activity className="h-4 w-4 text-gray-400" /></span>;
};

export function MachinesTable({ machines, canWrite, onEdit, onDelete, statusOptions }: MachinesTableProps) {
  if (machines.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">Sin maquinarias</h3>
        <p className="text-sm text-muted-foreground">No se encontraron máquinas con los filtros aplicados</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-center">Uso 30d</TableHead>
          <TableHead className="text-center">Horas 30d</TableHead>
          <TableHead className="text-center">Paradas</TableHead>
          <TableHead className="text-center">Averías</TableHead>
          <TableHead className="text-center">Sig. Mant.</TableHead>
          <TableHead className="text-center">Costo Mant.</TableHead>
          <TableHead className="text-center">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {machines.map((machine) => (
          <TableRow key={machine.id}>
            <TableCell className="font-mono text-sm">{machine.codigo}</TableCell>
            <TableCell>
              <Link 
                href={`/maquinas/${machine.id}`} 
                className="font-medium hover:underline text-blue-600 hover:text-blue-800"
              >
                {machine.nombre}
              </Link>
              <div className="text-xs text-muted-foreground">
                {machine.ubicacion || "Sin ubicación"}
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {machine.categoria || "—"}
            </TableCell>
            <TableCell>
              {getStatusBadge(machine.estado, statusOptions)}
            </TableCell>
            <TableCell className="text-center">
              {getUsageIcon(machine.horasUlt30d)}
            </TableCell>
            <TableCell className="text-center font-mono text-sm">
              {machine.horasUlt30d.toFixed(1)}h
            </TableCell>
            <TableCell className="text-center">
              {machine.paradasPorFallas30d > 0 ? (
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">{machine.paradasPorFallas30d}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">0</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {machine.averias30d > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {machine.averias30d}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">0</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {machine.horasParaSigMant !== null ? (
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {machine.horasParaSigMant > 24 
                      ? `${Math.round(machine.horasParaSigMant / 24)}d`
                      : `${machine.horasParaSigMant}h`
                    }
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {machine.costoMant30d > 0 ? (
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    ${machine.costoMant30d.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">$0</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-center gap-2">
                {canWrite && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(machine)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(machine.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}