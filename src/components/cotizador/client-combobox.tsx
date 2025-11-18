"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
import { ChevronsUpDown, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";

type ClientOption = {
  id: string;
  nombre: string;
  ruc: string;
};

export function ClientCombobox({
  value,
  onChange,
  clients,
  disabled = false,
  placeholder = "Buscar cliente...",
}: {
  value?: string;
  onChange: (clientId: string) => void;
  clients: ClientOption[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  
  const selected = clients.find((c) => c.id === value);

  // Filtrar clientes basado en la búsqueda
  const filteredClients = React.useMemo(() => {
    if (!query.trim()) return clients;
    
    const lowerQuery = query.toLowerCase();
    return clients.filter(
      (client) =>
        client.nombre.toLowerCase().includes(lowerQuery) ||
        client.ruc.includes(query)
    );
  }, [clients, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full h-11 justify-between border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
        >
          {selected ? (
            <div className="flex items-center gap-2 truncate text-left">
              <User className="h-4 w-4 text-slate-500" />
              <div className="flex flex-col items-start">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {selected.nombre}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  RUC: {selected.ruc}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar por nombre o RUC..."
            className="h-10"
          />
          <CommandList className="max-h-72">
            <CommandEmpty className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No se encontraron clientes
            </CommandEmpty>
            <CommandGroup heading="Clientes">
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={(id) => {
                    onChange(id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="py-3"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-medium text-slate-900 dark:text-slate-100 leading-5">
                      {client.nombre}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      RUC: {client.ruc}
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
