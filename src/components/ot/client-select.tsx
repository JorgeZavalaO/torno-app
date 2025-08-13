"use client";
import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ClientOption = { id: string; nombre: string };

export function ClientSelect({ value, onChange, clients, disabled }:{ value?: string; onChange:(v:string|undefined)=>void; clients: ClientOption[]; disabled?: boolean }){
  const id = useId();
  const NONE = "__none__";
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">Cliente</label>
      <Select
        value={value ?? ""}
        onValueChange={(v)=>{
          if (v === NONE) onChange(undefined);
          else onChange(v);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Selecciona cliente (opcional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sin cliente</SelectItem>
          {clients.map(c=> (
            <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
