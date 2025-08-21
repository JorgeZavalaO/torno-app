"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { MovementRow } from "./types";

export interface MovementsTableProps {
  movements: MovementRow[];
}

export const MovementsTable: React.FC<MovementsTableProps> = ({ movements }) => {
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "PEN" }).format(n);
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Fecha</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-center">Tipo</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Costo unit.</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead>Nota</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map(m => (
            <TableRow key={m.id}>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(m.fecha).toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="font-medium">{m.productoNombre}</div>
                <div className="text-xs text-muted-foreground">{m.productoId} • {m.uom}</div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={m.tipo.startsWith("INGRESO") ? "default":"destructive"} className="gap-1">
                  {m.tipo.startsWith("INGRESO") ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                  {m.tipo.replace("_"," ")}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{Number(m.cantidad).toFixed(3)}</TableCell>
              <TableCell className="text-right">{fmt(m.costoUnitario)}</TableCell>
              <TableCell className="text-right font-medium">{fmt(m.importe)}</TableCell>
              <TableCell className="text-sm">{m.nota ?? "—"}</TableCell>
            </TableRow>
          ))}
          {movements.length === 0 && (
            <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin movimientos</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
