"use client";

import { Button } from "@/components/ui/button";
import { Plus, Boxes, FileUp, Bell } from "lucide-react";
import React from "react";

export interface InventoryHeaderProps {
  canWrite: boolean;
  lowCount: number;
  showLowOnly: boolean;
  onToggleLow: () => void;
  onNewProduct: () => void;
  onNewMovement: () => void;
  onImport: () => void;
  onBulkStock?: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  canWrite,
  lowCount,
  showLowOnly,
  onToggleLow,
  onNewProduct,
  onNewMovement,
  onImport,
  onBulkStock,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">Productos, stock y movimientos</p>
      </div>
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Button
            variant={showLowOnly ? "default" : "outline"}
            size="icon"
            onClick={onToggleLow}
            title={showLowOnly ? "Ver todos" : "Ver solo stock bajo"}
          >
            <Bell className="h-4 w-4" />
          </Button>
          {lowCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
              {lowCount}
            </span>
          )}
        </div>

        {canWrite && (
          <>
            <Button onClick={onNewMovement} className="gap-2"><Boxes className="h-4 w-4" /> Nuevo movimiento</Button>
            {onBulkStock && (
              <Button variant="outline" onClick={onBulkStock} className="gap-2">
                <Boxes className="h-4 w-4" /> Carga Masiva
              </Button>
            )}
            <Button variant="outline" onClick={onNewProduct} className="gap-2"><Plus className="h-4 w-4" /> Nuevo producto</Button>
            <Button variant="outline" onClick={onImport} className="gap-2"><FileUp className="h-4 w-4" /> Importar productos</Button>
          </>
        )}
      </div>
    </div>
  );
};
