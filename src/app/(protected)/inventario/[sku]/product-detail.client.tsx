
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateToolInstanceDialog } from "@/components/inventario/create-tool-instance-dialog";
import { EquivalentCodes } from "@/components/inventario/equivalent-codes";
import { ProductLifeConfig } from "@/components/inventario/product-life-config";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Product = {
  sku: string;
  nombre: string;
  categoria: string;
  uom: string;
  costo: number;
  stockMinimo: number | null;
  createdAt: Date;
  updatedAt: Date;
  vidasUtilesCategoria: { id: string; machineCategoryId: string; vidaUtil: number | string | { toString: () => string }; machineCategory: { id: string; categoria: string } }[];
};

type Equivalent = { id: string; sistema: string; codigo: string; descripcion?: string | null };
type Movement = { id: string; fecha: Date; tipo: string; cantidad: number; costoUnitario: number; refTabla?: string; refId?: string; nota?: string; importe: number };

type Props = {
  producto: Product;
  stock: number;
  movs: Movement[];
  equivalentes: Equivalent[];
  systemCurrency: string;
  categories: { id: string; categoria: string }[];
  canWrite: boolean;
  actions: {
    addEquivalentCode: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    removeEquivalentCode: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    addMachineLife: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    removeMachineLife: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    createToolInstance: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
    getProductEquivalentCodes: (sku: string) => Promise<Equivalent[]>;
  };
};

export function ProductDetailClient({
  producto,
  stock,
  movs,
  equivalentes,
  systemCurrency,
  categories,
  canWrite,
  actions,
}: Props) {
  const router = useRouter();
  const [showCreateTool, setShowCreateTool] = useState(false);

  const low = producto.stockMinimo != null && Number(stock) < Number(producto.stockMinimo);
  const isHerramienta = producto.categoria === "HERRAMIENTA" || producto.categoria === "HERRAMIENTA_CORTE";

  const fmtMoney = (n: number, c?: string) => {
    const currency = c || systemCurrency;
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{producto.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {producto.sku} • {producto.uom} • {producto.categoria.replace("_", " ")}
          </p>
        </div>
        <div className="flex gap-2">
          {isHerramienta && canWrite && (
            <Button onClick={() => setShowCreateTool(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Instancia
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/inventario">Volver</Link>
          </Button>
        </div>
      </div>

      {/* KPIs + alerta visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Stock actual</div>
          <div className="text-2xl font-bold">{Number(stock).toFixed(3)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Costo referencia</div>
          <div className="text-2xl font-bold">{fmtMoney(Number(producto.costo))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Stock mínimo</div>
          <div className="text-2xl font-bold">{producto.stockMinimo ?? "—"}</div>
        </Card>
      </div>

      {low && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <div className="font-medium text-red-800">Stock por debajo del mínimo</div>
              <div className="text-sm text-red-700">
                Revisa compras o ajusta el stock mínimo si corresponde.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Códigos Equivalentes */}
      <EquivalentCodes
        sku={producto.sku}
        codes={equivalentes}
        actions={{
          addEquivalentCode: actions.addEquivalentCode,
          removeEquivalentCode: actions.removeEquivalentCode,
        }}
      />

      {/* Configuración de Vida Útil por Máquina */}
      {isHerramienta && (
        <ProductLifeConfig
          sku={producto.sku}
          configs={producto.vidasUtilesCategoria.map((v) => ({
            ...v,
            vidaUtil: Number(v.vidaUtil),
          }))}
          categories={categories}
          actions={{
            addMachineLife: actions.addMachineLife,
            removeMachineLife: actions.removeMachineLife,
          }}
        />
      )}

      {/* Tabla Kardex */}
      <Card className="overflow-hidden">
        <div className="p-4 font-semibold">Kardex de movimientos</div>
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-right p-2">Cantidad</th>
                <th className="text-right p-2">Costo unit.</th>
                <th className="text-right p-2">Importe</th>
                <th className="text-left p-2">Referencia</th>
                <th className="text-left p-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2 text-muted-foreground">
                    {new Date(m.fecha).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <Badge variant={m.tipo.startsWith("INGRESO") ? "default" : "destructive"}>
                      {m.tipo.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-2 text-right">{Number(m.cantidad).toFixed(3)}</td>
                  <td className="p-2 text-right">{fmtMoney(Number(m.costoUnitario))}</td>
                  <td className="p-2 text-right font-medium">{fmtMoney(Number(m.importe))}</td>
                  <td className="p-2">
                    {m.refTabla ? `${m.refTabla}${m.refId ? ` ${m.refId}` : ""}` : "—"}
                  </td>
                  <td className="p-2">{m.nota ?? "—"}</td>
                </tr>
              ))}
              {movs.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                    Sin movimientos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog para crear instancia de herramienta */}
      {isHerramienta && canWrite && (
        <CreateToolInstanceDialog
          open={showCreateTool}
          onOpenChange={setShowCreateTool}
          sku={producto.sku}
          nombreProducto={producto.nombre}
          onSuccess={(msg) => {
            toast.success(msg);
            router.refresh();
          }}
          actions={{ createToolInstance: actions.createToolInstance }}
        />
      )}
    </div>
  );
}
