"use client";

import React, { useMemo, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function OTSelect({ value, onChange, options = [], disabled = false }: {
  value: string;
  onChange: (v: string) => void;
  options?: { id: string; codigo: string }[];
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(o => o.codigo.toLowerCase().includes(s));
  }, [options, q]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Ninguna" />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2">
          <Input placeholder="Buscar OT..." value={q} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setQ(e.target.value)} className="mb-2" />
          <div className="max-h-48 overflow-auto">
            {filtered.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.codigo}</SelectItem>
            ))}
            {filtered.length === 0 && <div className="p-2 text-sm text-muted-foreground">No hay coincidencias</div>}
          </div>
        </div>
      </SelectContent>
    </Select>
  );
}
