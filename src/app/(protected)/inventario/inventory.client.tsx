"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
// (Botones se manejan en componentes hijos)
import { Input } from "@/components/ui/input";
import { Package, Boxes, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NewProductDialog } from "@/components/inventario/new-product-dialog";
import { EditProductDialog } from "@/components/inventario/edit-product-dialog";
import { NewMovementDialog } from "@/components/inventario/new-movement-dialog";
import { ImportProductsDialog } from "@/components/inventario/import-products-dialog";
import { BulkStockDialog } from "@/components/inventario/bulk-stock-dialog";
import { InventoryHeader } from "@/components/inventario/inventory-header";
import { InventoryStats } from "@/components/inventario/inventory-stats";
import { ProductTable } from "@/components/inventario/product-table";
import { MovementsTable } from "@/components/inventario/movements-table";
import type { ProductRow, MovementRow, ProductOption, Actions } from "@/components/inventario/types";
import { useDebouncedValue } from "@/hooks/use-debounced";

export default function InventoryClient({
  currency,
  canWrite,
  products,
  recentMovs,
  productOptions,
  uomOptions,
  categoryOptions,
  movementTypeOptions,
  actions,
}:{
  currency: string;
  canWrite: boolean;
  products: ProductRow[];
  recentMovs: MovementRow[];
  productOptions: ProductOption[];
  uomOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
  movementTypeOptions: { value: string; label: string }[];
  actions: Actions;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<ProductRow[]>(products);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBulkStock, setShowBulkStock] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  // estado nuevo
  const [showLowOnly, setShowLowOnly] = useState(false);

  const debouncedQuery = useDebouncedValue(q, 300);

  // Función de búsqueda
  const performSearch = useCallback(async (searchTerm: string) => {
    setIsSearching(true);
    try {
      const results = await actions.searchProducts(searchTerm.trim() || undefined);
      setSearchResults(results);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      toast.error('Error al buscar productos');
    } finally {
      setIsSearching(false);
    }
  }, [actions]);

  // Efecto para buscar con debounce
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // conteo global (no filtrado por búsqueda) - usar productos originales
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

  // ajusta 'filtered' - usar searchResults en lugar de products
  const filtered = useMemo(() => {
    const base = showLowOnly
      ? searchResults.filter(p => p.stockMinimo != null && Number(p.stock) < Number(p.stockMinimo))
      : searchResults;

    return base;
  }, [searchResults, showLowOnly]);

  const fmt = (n: number, c = currency) => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);

  const handleEditProduct = (product: ProductRow) => {
    setEditingProduct(product);
    setShowEditProduct(true);
  };

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
        onBulkStock={() => setShowBulkStock(true)}
      />

      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos" className="gap-1"><Package className="h-4 w-4" />Productos</TabsTrigger>
          <TabsTrigger value="movs" className="gap-1"><Boxes className="h-4 w-4" />Movimientos</TabsTrigger>
        </TabsList>

        {/* Productos */}
        <TabsContent value="productos" className="space-y-4">
          <Card className="p-4 flex items-center gap-3 max-w-lg">
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
            <Input 
              placeholder="Buscar por SKU, nombre o códigos equivalentes..." 
              value={q} 
              onChange={e => setQ(e.target.value)} 
            />
          </Card>

          <InventoryStats products={filtered} currency={currency} />

          <ProductTable 
            products={filtered} 
            fmtCurrency={(n:number)=>fmt(n, currency)} 
            onEdit={handleEditProduct}
            canWrite={canWrite}
          />
        </TabsContent>

        {/* Movimientos */}
        <TabsContent value="movs" className="space-y-4">
          <MovementsTable movements={recentMovs} currency={currency} />
        </TabsContent>
      </Tabs>

      {/* Modales */}
      {canWrite && (
        <>
          <NewProductDialog
            currency={currency}
            open={showNewProduct}
            onOpenChange={setShowNewProduct}
            onSuccess={(msg) => { toast.success(msg); router.refresh(); }}
            actions={actions}
            uomOptions={uomOptions}
            categoryOptions={categoryOptions}
          />
          <EditProductDialog
            currency={currency}
            open={showEditProduct}
            onOpenChange={(open) => {
              setShowEditProduct(open);
              if (!open) setEditingProduct(null);
            }}
            product={editingProduct}
            onSuccess={(msg) => { toast.success(msg); router.refresh(); }}
            actions={{
              updateProduct: actions.updateProduct,
              addEquivalentCode: actions.addEquivalentCode,
              removeEquivalentCode: actions.removeEquivalentCode,
              getProductEquivalentCodes: actions.getProductEquivalentCodes,
            }}
            uomOptions={uomOptions}
            categoryOptions={categoryOptions}
          />
          <NewMovementDialog
            currency={currency}
            open={showNewMovement}
            onOpenChange={setShowNewMovement}
            products={productOptions}
            onSuccess={(msg) => { toast.success(msg); router.refresh(); }}
            actions={actions}
            movementTypeOptions={movementTypeOptions}
          />
          <ImportProductsDialog
            open={showImport}
            onOpenChange={setShowImport}
            onSuccess={(msg) => { toast.success(msg); router.refresh(); }}
            actions={actions}
            categoryOptions={categoryOptions}
          />
          <BulkStockDialog
            open={showBulkStock}
            onOpenChange={setShowBulkStock}
            products={productOptions}
            onSuccess={(msg) => { toast.success(msg); router.refresh(); }}
            actions={actions}
          />
        </>
      )}
    </div>
  );
}
