
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Search, Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProductOption = {
  sku: string;
  nombre: string;
  uom: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  onSuccess: (msg: string) => void;
  actions: {
    registerInitialBalances: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  };
};

type Row = {
  id: string;
  sku: string;
  cantidad: string;
  costo: string;
};

export function BulkStockDialog({ open, onOpenChange, products, onSuccess, actions }: Props) {
  const [rows, setRows] = useState<Row[]>([createEmptyRow()]);
  const [isPending, setIsPending] = useState(false);
  const [nota, setNota] = useState("Saldo Inicial");

  function createEmptyRow(): Row {
    return { id: crypto.randomUUID(), sku: "", cantidad: "", costo: "" };
  }

  function addRow() {
    setRows([...rows, createEmptyRow()]);
  }

  function removeRow(id: string) {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
  }

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit() {
    // Validar
    const validRows = rows.filter(
      (r) => r.sku && Number(r.cantidad) > 0 && Number(r.costo) >= 0
    );

    if (validRows.length === 0) {
      toast.error("Agrega al menos un producto válido");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    fd.append(
      "items",
      JSON.stringify(
        validRows.map((r) => ({
          sku: r.sku,
          cantidad: Number(r.cantidad),
          costoUnitario: Number(r.costo),
        }))
      )
    );
    fd.append("nota", nota);

    const res = await actions.registerInitialBalances(fd);
    setIsPending(false);

    if (res.ok) {
      onSuccess(res.message || "Saldos registrados");
      onOpenChange(false);
      setRows([createEmptyRow()]);
      setNota("Saldo Inicial");
    } else {
      toast.error(res.message || "Error al registrar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Carga Masiva de Saldos Iniciales</DialogTitle>
          <DialogDescription>
            Agrega múltiples productos para establecer su stock inicial y costo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          <div className="flex-1">
            <Label>Nota del movimiento</Label>
            <Input value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Producto</TableHead>
                <TableHead className="w-[120px]">Cantidad</TableHead>
                <TableHead className="w-[120px]">Costo Unit.</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <ProductCombobox
                      products={products}
                      value={row.sku}
                      onChange={(sku) => updateRow(row.id, "sku", sku)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0.00"
                      value={row.cantidad}
                      onChange={(e) => updateRow(row.id, "cantidad", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={row.costo}
                      onChange={(e) => updateRow(row.id, "costo", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="pt-2">
          <Button variant="outline" onClick={addRow} className="w-full border-dashed">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Fila
          </Button>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : "Registrar Saldos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductCombobox({
  products,
  value,
  onChange,
}: {
  products: ProductOption[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selected = products.find((p) => p.sku === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.nombre} <span className="text-muted-foreground">({selected.uom})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar producto...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar producto..." />
          <CommandList>
            <CommandEmpty>No encontrado.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.sku}
                  value={`${product.nombre} ${product.sku}`}
                  onSelect={() => {
                    onChange(product.sku);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.sku ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{product.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.sku} • {product.uom}
                    </span>
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
