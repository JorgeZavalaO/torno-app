"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Factory, X } from "lucide-react";
import type { Provider, SCRow } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Reestructurado para multi-OC por SC:
 * - Siempre permite "Crear OC" cuando la SC está APPROVED (aunque ya existan OCs).
 * - Permite ingresar cantidades por ítem (default = pendiente).
 * - Valida que no exceda el pendiente.
 * - Agrega un "Rellenar todo" rápido.
 * - Al confirmar, agrupa por producto para construir el payload:
 *    [{ productoId, cantidadTotal, costoUnitarioPromedioPonderado }]
 *   (El server action createOC repartirá contra pendientes por producto).
 */
export function SCRowActions({
  row,
  canWrite,
  providers,
  onApprove,
  onCreateOC,
}: {
  row: SCRow;
  canWrite: boolean;
  providers: Provider[];
  onApprove: (next: SCRow["estado"]) => void;
  onCreateOC: (payload: {
    proveedorId: string;
    codigo: string;
    items: Array<{ productoId: string; cantidad: number; costoUnitario: number }>;
  }) => void;
}) {
  const hasProviders = providers.length > 0;
  const defaultCodigo = useMemo(
    () => `OC-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6)}`,
    []
  );

  const [proveedorId, setProveedorId] = useState(hasProviders ? providers[0].id : "");
  const [codigo, setCodigo] = useState(defaultCodigo);
  const [open, setOpen] = useState(false);

  // Clave estable por ítem (preferimos id; si no hay, fallback)
  const makeKey = (i: SCRow["items"][number], idx: number) => i.id ?? `${i.productoId}-${idx}`;

  // Pendiente por ítem (si no llega "pendiente", calculamos con cubierto)
  const calcPend = (i: SCRow["items"][number]) => {
    if (typeof i.pendiente === "number") return Math.max(0, Number(i.pendiente));
    if (typeof i.cubierto === "number") return Math.max(0, Number(i.cantidad) - Number(i.cubierto));
    return Number(i.cantidad) || 0;
  };

  // Estado local de cantidades a ordenar por ítem
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});

  // Inicializamos cantidades por defecto = pendiente
  useEffect(() => {
    const initial: Record<string, number> = {};
    row.items.forEach((it, idx) => {
      const k = makeKey(it, idx);
      initial[k] = calcPend(it);
    });
    setQtyByKey(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  // Validaciones
  const anyQty = useMemo(() => Object.values(qtyByKey).some(v => Number(v) > 0), [qtyByKey]);

  const invalidExceeds = useMemo(() => {
    for (let idx = 0; idx < row.items.length; idx++) {
      const it = row.items[idx];
      const k = makeKey(it, idx);
      const pend = calcPend(it);
      const v = Number(qtyByKey[k] ?? 0);
      if (v < 0) return true;
      if (v > pend) return true;
    }
    return false;
  }, [qtyByKey, row.items]);

  const totalToOrder = useMemo(
    () => Object.values(qtyByKey).reduce((s, v) => s + Number(v || 0), 0),
    [qtyByKey]
  );

  const fillAllPending = () => {
    const next: Record<string, number> = {};
    row.items.forEach((it, idx) => {
      const k = makeKey(it, idx);
      const pend = calcPend(it);
      next[k] = pend;
    });
    setQtyByKey(next);
  };

  if (!canWrite) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {row.estado === "PENDING_ADMIN" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onApprove("PENDING_GERENCIA")}
            className="gap-1"
          >
            <Factory className="h-3 w-3" /> Enviar a Gerencia
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onApprove("REJECTED")}
            className="gap-1"
          >
            <X className="h-3 w-3" /> Rechazar
          </Button>
        </>
      )}

      {row.estado === "PENDING_GERENCIA" && (
        <>
          <Button size="sm" onClick={() => onApprove("APPROVED")} className="gap-1">
            <Check className="h-3 w-3" /> Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onApprove("REJECTED")}
            className="gap-1"
          >
            <X className="h-3 w-3" /> Rechazar
          </Button>
        </>
      )}

      {row.estado === "APPROVED" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={!hasProviders}
              title={hasProviders ? "" : "Primero registra un proveedor"}
            >
              Crear OC
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[820px]">
            <DialogHeader>
              <DialogTitle>Crear Orden de Compra</DialogTitle>
              <DialogDescription>
                Asigna cantidades por ítem (por defecto igual al pendiente). Luego se agrupan por producto.
              </DialogDescription>
            </DialogHeader>

            {!hasProviders ? (
              <div className="text-sm text-red-600">
                No hay proveedores. Crea uno antes de generar la OC.
              </div>
            ) : (
              <>
                {/* Encabezado proveedor / código */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground mb-1">Proveedor</div>
                    <select
                      className="border rounded-md h-9 px-2 w-full"
                      value={proveedorId}
                      onChange={(e) => setProveedorId(e.target.value)}
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {p.ruc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Código</div>
                    <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                  </div>
                </div>

                {/* Resumen rápido */}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <div>
                    Ítems: {row.items.length} • A ordenar ahora: {totalToOrder}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={fillAllPending}>
                      Rellenar todo pendiente
                    </Button>
                  </div>
                </div>

                {/* Tabla de ítems con pendiente y cantidad a ordenar */}
                <div className="max-h-[45vh] overflow-auto rounded-md border mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Pedido</th>
                        <th className="text-right p-2">Cubierto</th>
                        <th className="text-right p-2">Pendiente</th>
                        <th className="text-right p-2">Ordenar</th>
                        <th className="text-right p-2">Costo Unit. (est.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.items.map((i, idx) => {
                        const k = makeKey(i, idx);
                        const pendiente = calcPend(i);
                        const cubierto = typeof i.cubierto === "number" ? i.cubierto : (Number(i.cantidad) - pendiente);
                        return (
                          <tr key={k}>
                            <td className="p-2">
                              <div className="truncate" title={`${i.nombre ?? i.productoId} — ${i.productoId}`}>
                                {i.nombre ?? i.productoId}
                              </div>
                              <div className="text-xxs text-muted-foreground font-mono">{i.productoId}</div>
                            </td>
                            <td className="p-2 text-right">{i.cantidad} {i.uom}</td>
                            <td className="p-2 text-right">{Number(cubierto)}</td>
                            <td className="p-2 text-right">{pendiente}</td>
                            <td className="p-2 text-right">
                              <Input
                                className="h-8"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={pendiente}
                                step="0.001"
                                value={qtyByKey[k] ?? 0}
                                onChange={(e) => setQtyByKey((m) => ({
                                  ...m,
                                  [k]: e.target.value === "" ? 0 : Number(e.target.value)
                                }))}
                              />
                            </td>
                            <td className="p-2 text-right">
                              {i.costoEstimado != null
                                ? Number(i.costoEstimado).toFixed(2)
                                : "0.00"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer con validaciones */}
                <div className="flex items-center justify-between pt-3">
                  <div className="text-xs">
                    {invalidExceeds && (
                      <span className="text-red-600">Hay cantidades inválidas (negativas o mayores al pendiente).</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total a ordenar: <span className="font-medium">{totalToOrder}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (!proveedorId) return;
                      if (invalidExceeds) return;

                      // Construir payload agrupado por producto
                      type Tmp = { qty: number; sumCost: number; sumQtyForAvg: number };
                      const acc = new Map<string, Tmp>();

                      row.items.forEach((i, idx) => {
                        const k = makeKey(i, idx);
                        const qty = Number(qtyByKey[k] || 0);
                        if (qty <= 0) return;
                        const cost = Number(i.costoEstimado ?? 0);
                        const cur = acc.get(i.productoId) ?? { qty: 0, sumCost: 0, sumQtyForAvg: 0 };
                        cur.qty += qty;
                        cur.sumCost += cost * qty;       // para promedio ponderado
                        cur.sumQtyForAvg += qty;
                        acc.set(i.productoId, cur);
                      });

                      const lines = Array.from(acc.entries()).map(([productoId, v]) => ({
                        productoId,
                        cantidad: Number(v.qty),
                        costoUnitario: v.sumQtyForAvg > 0 ? Number((v.sumCost / v.sumQtyForAvg).toFixed(2)) : 0,
                      }));

                      if (lines.length === 0) {
                        // Si no se ingresó nada, no creamos OC
                        return;
                      }

                      onCreateOC({ proveedorId, codigo, items: lines });
                      setOpen(false);
                    }}
                    disabled={!proveedorId || invalidExceeds || !anyQty}
                    title={!proveedorId ? "Selecciona un proveedor" : ""}
                  >
                    Confirmar OC
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
