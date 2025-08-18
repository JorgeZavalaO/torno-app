"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface ComboboxProps<Item> {
  items: Item[];
  onChange: (value: string) => void;
  renderItem?: (item: Item) => React.ReactNode;
  label?: string;
  placeholder?: string;
  itemKey?: (item: Item) => string;
}

export function Combobox({ items, onChange, renderItem, placeholder, itemKey }: ComboboxProps<any>) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const qq = q.toLowerCase();
    return items.filter((it) => {
      const k = (it as unknown as any)?.sku ?? (it as unknown as any)?.name ?? (it as unknown as any)?.nombre ?? '';
      return String(k).toLowerCase().includes(qq);
    });
  }, [items, q]);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input placeholder={placeholder} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow max-h-44 overflow-auto">
          {filtered.map((it) => {
      const key = itemKey ? itemKey(it) : (it as unknown as any)?.sku ?? String(Math.random());
            return (
              <div key={key} className={cn("p-2 hover:bg-slate-50 cursor-pointer")}
                onMouseDown={(e)=>{e.preventDefault();}}
        onClick={() => { onChange((it as unknown as any)?.sku ?? (it as unknown as any)?.id ?? String(key)); setOpen(false); setQ(""); }}
              >
        {renderItem ? renderItem(it) : <>{(it as unknown as any)?.sku} — {(it as unknown as any)?.nombre || (it as unknown as any)?.name}</>}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="p-2 text-sm text-muted-foreground">No hay resultados</div>}
        </div>
      )}
    </div>
  );
}
