"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, FileText } from "lucide-react";

interface MachineEvent {
  id: string;
  inicio: string | Date;
  tipo: string;
  horas?: number | null;
  nota?: string | null;
  ot?: { codigo: string } | null;
  usuario?: { displayName?: string; email?: string } | null;
}

interface MachineEventsTableProps {
  events: MachineEvent[];
}

const getEventBadge = (tipo: string) => {
  const variants = {
    USO: "default",
    PARO: "destructive", 
    MANTENIMIENTO: "secondary",
    AVERIA: "destructive",
    DISPONIBLE: "outline"
  } as const;
  
  return (
    <Badge variant={variants[tipo as keyof typeof variants] || "outline"}>
      {tipo}
    </Badge>
  );
};

export function MachineEventsTable({ events }: MachineEventsTableProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Eventos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">Sin eventos</h3>
            <p className="text-sm text-muted-foreground">No hay eventos registrados para esta máquina</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Eventos recientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>OT</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map(event => (
              <TableRow key={event.id}>
                <TableCell className="text-sm">
                  {new Date(event.inicio).toLocaleString()}
                </TableCell>
                <TableCell>
                  {getEventBadge(event.tipo)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {event.ot?.codigo || "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {event.horas ? `${Number(event.horas).toFixed(2)}h` : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {event.usuario?.displayName || event.usuario?.email || "—"}
                  </div>
                </TableCell>
                <TableCell className="text-sm max-w-xs truncate">
                  {event.nota ? (
                    <div className="flex items-center gap-2" title={event.nota}>
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {event.nota}
                    </div>
                  ) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
