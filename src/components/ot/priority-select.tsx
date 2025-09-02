"use client";
import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowUp, Minus, Zap } from "lucide-react";
import type { Prioridad } from "./priority-badge";

const priorityOptions = [
  { value: "LOW", label: "Baja", icon: Minus, className: "text-slate-600" },
  { value: "MEDIUM", label: "Media", icon: ArrowUp, className: "text-blue-600" },
  { value: "HIGH", label: "Alta", icon: AlertTriangle, className: "text-orange-600" },
  { value: "URGENT", label: "Urgente", icon: Zap, className: "text-red-600" },
] as const;

export function PrioritySelect({ value, onChange, disabled }:{ value: Prioridad; onChange:(v:Prioridad)=>void; disabled?: boolean }){
  const id = useId();
  const currentOption = priorityOptions.find(opt => opt.value === value);
  
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">Prioridad</label>
      <Select value={value} onValueChange={v=>onChange(v as Prioridad)} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Selecciona prioridad">
            {currentOption && (
              <div className="flex items-center gap-2">
                <currentOption.icon className={`h-4 w-4 ${currentOption.className}`} />
                <span>{currentOption.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className={`h-4 w-4 ${option.className}`} />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
