"use client";

import { useMemo, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
// (Botones se manejan en componentes hijos)
import { Input } from "@/components/ui/input";
import { Package, Boxes, Search } from "lucide-react";
import { toast } from "sonner";
import { NewProductDialog } from "@/components/inventario/new-product-dialog";
import { NewMovementDialog } from "@/components/inventario/new-movement-dialog";
import { ImportProductsDialog } from "@/components/inventario/import-products-dialog";
import { InventoryHeader } from "@/components/inventario/inventory-header";
import { InventoryStats } from "@/components/inventario/inventory-stats";
import { ProductTable } from "@/components/inventario/product-table";
import { MovementsTable } from "@/components/inventario/movements-table";
import type { ProductRow, MovementRow, ProductOption, Actions } from "@/components/inventario/types";

export default function InventoryClient({
  canWrite,
  products,
  recentMovs,
  productOptions,
  actions,
}:{
  canWrite: boolean;
  products: ProductRow[];
  recentMovs: MovementRow[];
  productOptions: ProductOption[];
  actions: Actions;
}) {
  const [q, setQ] = useState("");
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [showImport, setShowImport] = useState(false);
  // estado nuevo
  const [showLowOnly, setShowLowOnly] = useState(false);

  // conteo global (no filtrado por búsqueda)
  const lowCount = products.filter(
    p => p.stockMinimo != null && Number(p.stock) < Number(p.stockMinimo)
  ).length;

  // opcional: toast cuando hay bajos
  useEffect(() => {
    if (lowCount > 0) {
      // usa sonner
      // toast.warning(`${lowCount} productos con stock bajo`);
    }
  }, [lowCount]);

  // ajusta 'filtered'
  const filtered = useMemo(() => {
    const base = showLowOnly
      ? products.filter(p => p.stockMinimo != null && Number(p.stock) < Number(p.stockMinimo))
      : products;

    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter(p =>
      p.nombre.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
    );
  }, [q, products, showLowOnly]);

  const fmt = (n: number, c = "PEN") => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);

  return (
    <div className="p-6 space-y-6">
      <InventoryHeader
        canWrite={canWrite}
        lowCount={lowCount}
        showLowOnly={showLowOnly}
        onToggleLow={() => setShowLowOnly(v => !v)}
        onNewProduct={() => setShowNewProduct(true)}
        onNewMovement={() => setShowNewMovement(true)}
        onImport={() => setShowImport(true)}
      />

      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos" className="gap-1"><Package className="h-4 w-4" />Productos</TabsTrigger>
          <TabsTrigger value="movs" className="gap-1"><Boxes className="h-4 w-4" />Movimientos</TabsTrigger>
        </TabsList>

        {/* Productos */}
        <TabsContent value="productos" className="space-y-4">
          <Card className="p-4 flex items-center gap-3 max-w-lg">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por SKU o nombre..." value={q} onChange={e => setQ(e.target.value)} />
          </Card>

          <InventoryStats products={filtered} />

          <ProductTable products={filtered} fmtCurrency={(n:number)=>fmt(n)} />
        </TabsContent>

        {/* Movimientos */}
        <TabsContent value="movs" className="space-y-4">
          <MovementsTable movements={recentMovs} />
        </TabsContent>
      </Tabs>

      {/* Modales */}
      {canWrite && (
        <>
          <NewProductDialog open={showNewProduct} onOpenChange={setShowNewProduct} onSuccess={(msg) => toast.success(msg)} actions={actions} />
          <NewMovementDialog open={showNewMovement} onOpenChange={setShowNewMovement} products={productOptions} onSuccess={(msg) => toast.success(msg)} actions={actions} />
          <ImportProductsDialog open={showImport} onOpenChange={setShowImport} onSuccess={(msg) => toast.success(msg)} actions={actions} />
        </>
      )}
    </div>
  );
}
