"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Check, ChevronsUpDown, Plus, Trash2,
} from "lucide-react";

type MatRow = { sku: string; nombre: string; uom?: string; plan: number; emit: number; pend: number };
type ProductsMini = Awaited<ReturnType<typeof import("@/app/server/queries/ot").getProductsMini>> & { categoria?: string }[];

// --- Mini Combobox (shadcn) para materiales ---
function MaterialCombobox({
  value,
  onChange,
  planOptions,
  allOptions,
  placeholder = "Selecciona material...",
}: {
  value?: string;
  onChange: (v: string) => void;
  planOptions: { value: string; label: string; extra?: string; pend?: number }[];
  allOptions: { value: string; label: string; extra?: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const current =
    planOptions.find((o) => o.value === value) ??
    allOptions.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          <span className="truncate text-left">
            {current ? (
              <>
                <span className="font-medium">{current.label}</span>
                {current.extra && (
                  <span className="text-muted-foreground"> {" "}{current.extra}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[36rem] max-w-[90vw]">
        <Command>
          <CommandInput placeholder="Buscar por nombre o SKU..." />
          <CommandEmpty>Sin resultados</CommandEmpty>
          <CommandList className="max-h-72">
            {planOptions.length > 0 && (
              <CommandGroup heading="Planificados">
                {planOptions.map((opt) => (
                  <CommandItem
                    key={`plan-${opt.value}`}
                    value={`${opt.label} ${opt.extra ?? ""}`}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={`h-4 w-4 ${value === opt.value ? "opacity-100" : "opacity-0"}`}
                    />
                    <div className="min-w-0">
                      <div className="truncate">{opt.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {opt.extra}
                      </div>
                    </div>
                    {typeof opt.pend === "number" && (
                      <Badge className="ml-auto text-xs">{opt.pend} pend.</Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Todos los materiales">
              {allOptions.map((opt) => (
                <CommandItem
                  key={`all-${opt.value}`}
                  value={`${opt.label} ${opt.extra ?? ""}`}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={`h-4 w-4 ${value === opt.value ? "opacity-100" : "opacity-0"}`}
                  />
                  <div className="min-w-0">
                    <div className="truncate">{opt.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {opt.extra}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function EmitMaterialsDialog({
  open, onOpenChange, materials, products, onEmit,
}:{
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  materials: MatRow[];
  products: ProductsMini;
  onEmit: (items: { sku: string; qty: number }[])=>Promise<void>;
}) {
  const [rows, setRows] = useState<{ sku: string; qty: number }[]>([]);

  // Opciones derivadas
  const planOptions = useMemo(() => {
    return materials.map((m) => ({
      value: m.sku,
      label: m.nombre,
      extra: `(${m.sku})`,
      pend: m.pend,
    }));
  }, [materials]);

  const allOptions = useMemo(() => {
    const notFab = products.filter((p) =>
      p.categoria ? String(p.categoria).toUpperCase() !== "FABRICACION" : true
    );
    return notFab.map((p) => ({
      value: p.sku,
      label: p.nombre,
      extra: `(${p.sku})`,
    }));
  }, [products]);

  const addFromPlan = () => {
    const defaults = materials
      .filter((m) => m.pend > 0)
      .map((m) => ({ sku: m.sku, qty: m.pend }));
    setRows(defaults.length ? defaults : [{ sku: allOptions[0]?.value ?? "", qty: 1 }]);
  };
  const addRow = () =>
    setRows((prev) => [...prev, { sku: allOptions[0]?.value ?? "", qty: 1 }]);
  const delRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));
  const setRow = (idx: number, patch: Partial<{ sku: string; qty: number }>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const valid = useMemo(() => rows.filter((r) => r.sku && r.qty > 0), [rows]);
  const totalQty = useMemo(() => valid.reduce((s, r) => s + Number(r.qty || 0), 0), [valid]);

  // Limpia líneas al cerrar
  useEffect(() => { if (!open) setRows([]); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Emitir materiales</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Acciones rápidas */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={addFromPlan}>
              Precargar faltantes
            </Button>
            <Button variant="secondary" size="sm" onClick={addRow}>
              <Plus className="h-3 w-3 mr-1" />
              Agregar línea
            </Button>
          </div>

          {/* Tabla/Listado de líneas */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[65%]">Producto</TableHead>
                  <TableHead className="text-right w-[20%]">Cantidad</TableHead>
                  <TableHead className="text-center w-[15%]">Acción</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <ScrollArea className="max-h-[340px]">
              <Table>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className="align-middle">
                      <TableCell>
                        <MaterialCombobox
                          value={r.sku}
                          onChange={(v) => setRow(i, { sku: v })}
                          planOptions={planOptions}
                          allOptions={allOptions}
                          placeholder="Producto…"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0.001}
                          step="0.001"
                          value={r.qty}
                          onChange={(e) => setRow(i, { qty: Number(e.target.value) })}
                          className="w-full h-10 text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => delRow(i)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Añade líneas manualmente o usa <span className="font-medium">Precargar faltantes</span>.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Nota + Resumen */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="text-muted-foreground">
              * Las salidas se registran con signo negativo (convención) y actualizan el emitido de la OT.
            </div>
            <div className="text-right">
              <span className="text-muted-foreground mr-2">Líneas válidas:</span>
              <Badge variant="secondary" className="mr-3">{valid.length}</Badge>
              <span className="text-muted-foreground mr-2">Cantidad total:</span>
              <Badge>{totalQty.toLocaleString()}</Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              await onEmit(valid);
              onOpenChange(false);
            }}
            disabled={valid.length === 0}
          >
            Emitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
