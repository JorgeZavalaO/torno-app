"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Calendar, CheckCircle } from "lucide-react";

interface Maintenance {
  id: string;
  tipo: string;
  estado: string;
  fechaProg: string | Date;
  fechaReal?: string | Date | null;
  costo?: number | null;
  nota?: string | null;
}

interface MachineMaintenanceTableProps {
  maintenances: Maintenance[];
  canWrite: boolean;
  onCloseMaintenance: (id: string) => Promise<void>;
}

const getMaintenanceStatusBadge = (estado: string) => {
  switch (estado) {
    case "PENDIENTE":
      return <Badge variant="destructive">Pendiente</Badge>;
    case "COMPLETADO":
      return <Badge variant="default">Completado</Badge>;
    case "EN_PROCESO":
      return <Badge variant="secondary">En proceso</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
};

export function MachineMaintenanceTable({ maintenances, canWrite, onCloseMaintenance }: MachineMaintenanceTableProps) {
  if (maintenances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Mantenimientos programados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">Sin mantenimientos</h3>
            <p className="text-sm text-muted-foreground">No hay mantenimientos programados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Mantenimientos programados
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha programada</TableHead>
              <TableHead>Fecha real</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenances.map(maintenance => (
              <TableRow key={maintenance.id}>
                <TableCell className="font-medium">{maintenance.tipo}</TableCell>
                <TableCell>{getMaintenanceStatusBadge(maintenance.estado)}</TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {new Date(maintenance.fechaProg).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {maintenance.fechaReal ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {new Date(maintenance.fechaReal).toLocaleDateString()}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {maintenance.costo ? `${Number(maintenance.costo).toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-sm max-w-xs truncate">
                  {maintenance.nota || "—"}
                </TableCell>
                <TableCell className="text-center">
                  {canWrite && maintenance.estado === "PENDIENTE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCloseMaintenance(maintenance.id)}
                      className="h-8"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}