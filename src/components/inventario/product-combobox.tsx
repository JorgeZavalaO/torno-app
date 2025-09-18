"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandItem,
  CommandGroup,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductOption = {
  sku: string;
  nombre: string;
  uom: string;
  stock?: number | null;
  lastCost?: number | null;
  categoria?: string;
};

// Hook simple para debouncing de valores
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function ProductCombobox({
  value,
  onChange,
  initialOptions = [],
  disabled = false,
  placeholder = "Busca y selecciona un producto…",
}: {
  value?: string;
  onChange: (sku: string) => void;
  initialOptions?: ProductOption[];
  disabled?: boolean;
  placeholder?: string;
}) {

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 300);
  const [options, setOptions] = React.useState<ProductOption[]>(initialOptions);
  const [loading, setLoading] = React.useState(false);
  const selected = options.find((o) => o.sku === value);

  // Sincroniza opciones iniciales solo si cambian de referencia
  React.useEffect(() => {
    if (initialOptions && initialOptions.length > 0) {
      setOptions(initialOptions);
    }
  }, [initialOptions]);

  // Busca productos remotamente solo si el popover está abierto y hay query
  React.useEffect(() => {
    if (!open) return;
    // Si no hay query y ya hay opciones iniciales, no buscar
    if (!debounced.trim() && initialOptions && initialOptions.length > 0) return;

    const abort = new AbortController();
    async function fetchOptions() {
      setLoading(true);
      try {
        const url = debounced.trim().length > 0
          ? `/api/inventory/products?q=${encodeURIComponent(debounced)}`
          : `/api/inventory/products`;
        const res = await fetch(url, { signal: abort.signal, cache: "no-store" });
        if (!res.ok) throw new Error("Error al buscar productos");
        const data = await res.json();
        if (data?.ok) setOptions(data.products ?? []);
        else throw new Error(data?.message || "Sin resultados");
      } catch {
        // Manejo de error más explícito
        setOptions([]);
        // Opcional: mostrar error con toast o consola
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
    return () => abort.abort();
  }, [debounced, open, initialOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selected ? (
            <span className="truncate text-left">
              {selected.nombre}
              <span className="ml-2 text-muted-foreground">
                • {selected.sku} • {selected.uom}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Escribe nombre, SKU o código equivalente…"
          />
          <CommandList className="max-h-72">
            {loading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Buscando…
              </div>
            )}
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              Sin resultados
            </CommandEmpty>
            <CommandGroup heading="Productos">
              {options.map((opt) => (
                <CommandItem
                  key={opt.sku}
                  value={opt.sku}
                  onSelect={(sku) => {
                    onChange(sku);
                    setOpen(false);
                  }}
                  className="py-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.sku ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium leading-5">{opt.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {opt.sku} • {opt.uom}
                      {typeof opt.stock === "number" ? (
                        <>
                          {" "}
                          • Stock:&nbsp;
                          <Badge variant="outline" className="px-1">
                            {opt.stock}
                          </Badge>
                        </>
                      ) : null}
                      {typeof opt.lastCost === "number" ? (
                        <> • Costo ref: {opt.lastCost.toFixed(2)}</>
                      ) : null}
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
