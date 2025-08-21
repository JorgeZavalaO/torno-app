"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import type { ProductRow } from "./types";

export interface InventoryStatsProps {
  products: ProductRow[]; // productos filtrados
  currency?: string;
}

const fmtCurrency = (n: number, c = "PEN") => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);

export const InventoryStats: React.FC<InventoryStatsProps> = ({ products, currency }) => {
  const totalStockValue = products.reduce((acc, p) => acc + Number(p.stockValue), 0);
  const lowFiltered = products.filter(p => p.stockMinimo != null && Number(p.stock) < Number(p.stockMinimo)).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Valor total (filtrado)</div>
        <div className="text-2xl font-bold">{fmtCurrency(totalStockValue, currency)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Con stock bajo</div>
        <div className="text-2xl font-bold">{lowFiltered}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Productos</div>
        <div className="text-2xl font-bold">{products.length}</div>
      </Card>
    </div>
  );
};
