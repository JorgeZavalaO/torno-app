"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Wrench, Activity } from "lucide-react";

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
};

interface MachinesTableProps {
  machines: MachineRow[];
  canWrite: boolean;
  onEdit: (machine: MachineRow) => void;
  onDelete: (id: string) => void;
}

const getStatusBadge = (estado: MachineRow["estado"]) => {
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

export function MachinesTable({ machines, canWrite, onEdit, onDelete }: MachinesTableProps) {
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
          <TableHead>Ubicación</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead className="text-center">Uso 30d</TableHead>
          <TableHead className="text-center">Horas 30d</TableHead>
          <TableHead className="text-center">Mant. Pend.</TableHead>
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
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {machine.categoria || "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {machine.ubicacion || "—"}
            </TableCell>
            <TableCell className="text-center">
              {getStatusBadge(machine.estado)}
            </TableCell>
            <TableCell className="text-center">
              {getUsageIcon(machine.horasUlt30d)}
            </TableCell>
            <TableCell className="text-center font-mono text-sm">
              {machine.horasUlt30d.toFixed(1)}h
            </TableCell>
            <TableCell className="text-center">
              {machine.pendMant > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {machine.pendMant}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
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