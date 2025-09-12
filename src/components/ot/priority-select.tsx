"use client";
import { useId, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowUp, Minus, Zap } from "lucide-react";
import type { Prioridad } from "./priority-badge";

type IconComponent = React.ComponentType<{ className?: string }>;
const defaultOptions = [
  { value: "LOW", label: "Baja", icon: Minus as IconComponent, className: "text-slate-600" },
  { value: "MEDIUM", label: "Media", icon: ArrowUp as IconComponent, className: "text-blue-600" },
  { value: "HIGH", label: "Alta", icon: AlertTriangle as IconComponent, className: "text-orange-600" },
  { value: "URGENT", label: "Urgente", icon: Zap as IconComponent, className: "text-red-600" },
] as const;

type CatalogOption = { value: string; label: string };

export function PrioritySelect({ value, onChange, disabled, options }:{ value: Prioridad; onChange:(v:Prioridad)=>void; disabled?: boolean; options?: CatalogOption[] }){
  const id = useId();
  const mapped = useMemo(()=>{
    // Map catalog options to include icons/colors using defaults when values match
    if (!options || options.length === 0) return defaultOptions as readonly { value: string; label: string; icon: IconComponent; className: string }[];
    const iconMap: Record<string, IconComponent> = { LOW: Minus, MEDIUM: ArrowUp, HIGH: AlertTriangle, URGENT: Zap };
    const colorMap: Record<string, string> = { LOW: "text-slate-600", MEDIUM: "text-blue-600", HIGH: "text-orange-600", URGENT: "text-red-600" };
    return options.map(o => ({ value: o.value, label: o.label, icon: iconMap[o.value] || Minus, className: colorMap[o.value] || "text-slate-600" }));
  }, [options]);
  const currentOption = mapped.find(opt => opt.value === value);
  
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
          {mapped.map(option => (
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
