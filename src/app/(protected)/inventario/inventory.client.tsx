"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Boxes, ArrowDownToLine, ArrowUpFromLine, Search, FileUp } from "lucide-react";
import { toast } from "sonner";
import { NewProductDialog } from "./new-product-dialog";
import { NewMovementDialog } from "./new-movement-dialog";
import { ImportProductsDialog } from "./import-products-dialog";

type ProductRow = {
  sku: string;
  nombre: string;
  categoria: "MATERIA_PRIMA" | "HERRAMIENTA_CORTE" | "CONSUMIBLE" | "REPUESTO";
  uom: string;
  costo: number;
  stockMinimo: number | null;
  stock: number;
  lastCost: number;
  stockValue: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type MovementRow = {
  id: string;
  fecha: string | Date;
  tipo: "INGRESO_COMPRA"|"INGRESO_AJUSTE"|"SALIDA_AJUSTE"|"SALIDA_OT";
  productoId: string;
  productoNombre: string;
  categoria: ProductRow["categoria"];
  cantidad: number;
  uom: string;
  costoUnitario: number;
  importe: number;
  nota?: string;
};

type ProductOption = { sku: string; nombre: string; uom: string };

type Actions = {
  createProduct: (fd: FormData) => Promise<{ ok: boolean; message?: string; sku?: string }>;
  updateProduct: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  deleteProduct: (sku: string) => Promise<{ ok: boolean; message?: string }>;
  createMovement: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  importProducts: (file: File) => Promise<{ ok: boolean; message?: string; imported?: number }>;
};

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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter(p =>
      p.nombre.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
    );
  }, [q, products]);

  const totalStockValue = filtered.reduce((acc, p) => acc + Number(p.stockValue), 0);
  const fmt = (n: number, c = "PEN") => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">Productos, stock y movimientos</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button onClick={() => setShowNewMovement(true)} className="gap-2"><Boxes className="h-4 w-4" /> Nuevo movimiento</Button>
            <Button variant="outline" onClick={() => setShowNewProduct(true)} className="gap-2"><Plus className="h-4 w-4" /> Nuevo producto</Button>
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2"><FileUp className="h-4 w-4" /> Importar productos</Button>
          </div>
        )}
      </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Valor total (filtrado)</div>
              <div className="text-2xl font-bold">{fmt(totalStockValue)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Con stock bajo</div>
              <div className="text-2xl font-bold">
                {filtered.filter(p => p.stockMinimo != null && Number(p.stock) < Number(p.stockMinimo)).length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Productos</div>
              <div className="text-2xl font-bold">{filtered.length}</div>
            </Card>
          </div>

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
                {filtered.map(p => {
                  const low = p.stockMinimo != null && Number(p.stock) < Number(p.stockMinimo);
                  return (
                    <TableRow key={p.sku}>
                      <TableCell className="font-mono">{p.sku}</TableCell>
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
                      <TableCell className="text-right">{fmt(Number(p.lastCost))}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(p.stockValue))}</TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin productos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Movimientos */}
        <TabsContent value="movs" className="space-y-4">
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
                {recentMovs.map(m => (
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
                    <TableCell className="text-right">{new Intl.NumberFormat(undefined, { style:"currency", currency:"PEN"}).format(m.costoUnitario)}</TableCell>
                    <TableCell className="text-right font-medium">{new Intl.NumberFormat(undefined, { style:"currency", currency:"PEN"}).format(m.importe)}</TableCell>
                    <TableCell className="text-sm">{m.nota ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {recentMovs.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin movimientos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
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
