import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getProductKardex, getMachineCategories } from "@/app/server/queries/inventory";
import { Button } from "@/components/ui/button";
import { EquivalentCodes } from "@/components/inventario/equivalent-codes";
import { ProductLifeConfig } from "@/components/inventario/product-life-config";
import { addEquivalentCode, removeEquivalentCode, addMachineLife, removeMachineLife } from "../actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProductKardexPage({ params }: { params: Promise<{ sku: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");
  const canRead = await userHasPermission(me.email, "inventory.read");
  if (!canRead) redirect("/");

  const { sku: rawSku } = await params;
  const sku = decodeURIComponent(rawSku);
  const [data, categories] = await Promise.all([
    getProductKardex(sku),
    getMachineCategories(),
  ]);
  if (!data) redirect("/inventario");

  // Obtener la moneda del sistema desde parámetros
  const currencyParam = await getCostingParamByKey("currency");
  const systemCurrency = currencyParam?.valueText || "USD";

  const { producto, stock, movs, equivalentes } = data as typeof data & { 
    equivalentes: { id: string; sistema: string; codigo: string; descripcion?: string | null }[];
    producto: { vidasUtilesCategoria: { id: string; machineCategoryId: string; vidaUtil: any; machineCategory: { id: string; categoria: string } }[] }
  };
  const low =
    producto.stockMinimo != null &&
    Number(stock) < Number(producto.stockMinimo);

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
          <Button asChild variant="outline">
            <Link href="/inventario">Volver</Link>
          </Button>
        </div>
      </div>

      {/* KPIs + alerta visual (burbuja) */}
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
            <span className="relative inline-flex">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-red-600/30 animate-ping" />
            </span>
            <div>
              <div className="font-medium text-red-800">Stock por debajo del mínimo</div>
              <div className="text-sm text-red-700">
                Revisa compras o ajusta el stock mínimo si corresponde.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabla Kardex */}
  <EquivalentCodes sku={producto.sku} codes={equivalentes} actions={{ addEquivalentCode, removeEquivalentCode }} />

  {producto.categoria === "HERRAMIENTA" && (
    <ProductLifeConfig
      sku={producto.sku}
      configs={producto.vidasUtilesCategoria.map((v) => ({
        ...v,
        vidaUtil: Number(v.vidaUtil),
      }))}
      categories={categories}
      actions={{ addMachineLife, removeMachineLife }}
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
              {movs.map(m => (
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
    </div>
  );
}
