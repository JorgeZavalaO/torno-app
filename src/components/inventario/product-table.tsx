"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ProductRow } from "./types";
import Link from "next/link";

export interface ProductTableProps {
  products: ProductRow[]; // ya filtrados
  fmtCurrency?: (n: number) => string;
}

const defaultFmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "PEN" }).format(n);

export const ProductTable: React.FC<ProductTableProps> = ({ products, fmtCurrency = defaultFmt }) => {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-center">Categoría</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-right">Costo ref.</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(p => {
            const low = p.stockMinimo != null && Number(p.stock) < Number(p.stockMinimo);
            return (
              <TableRow key={p.sku}>
                <TableCell className="font-mono">
                  <Link href={`/inventario/${encodeURIComponent(p.sku)}`} className="underline-offset-2 hover:underline">
                    {p.sku}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground">{p.uom}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{p.categoria.replace("_"," ")}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className={low ? "text-red-600 font-semibold" : ""}>
                    {Number(p.stock).toFixed(3)}
                  </span>
                  {p.stockMinimo != null && (
                    <span className="text-xs text-muted-foreground"> / min {Number(p.stockMinimo).toFixed(0)}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{fmtCurrency(Number(p.lastCost))}</TableCell>
                <TableCell className="text-right font-medium">{fmtCurrency(Number(p.stockValue))}</TableCell>
              </TableRow>
            );
          })}
          {products.length === 0 && (
            <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin productos</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
