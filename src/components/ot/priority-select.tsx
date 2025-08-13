"use client";
import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Prioridad } from "./priority-badge";

export function PrioritySelect({ value, onChange, disabled }:{ value: Prioridad; onChange:(v:Prioridad)=>void; disabled?: boolean }){
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">Prioridad</label>
      <Select value={value} onValueChange={v=>onChange(v as Prioridad)} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Selecciona prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="LOW">Baja</SelectItem>
          <SelectItem value="MEDIUM">Media</SelectItem>
          <SelectItem value="HIGH">Alta</SelectItem>
          <SelectItem value="URGENT">Urgente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
