import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EstadoOT = "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED";

const config: Record<EstadoOT, { label: string; className: string; variant?: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { 
    label: "Borrador", 
    className: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80",
    variant: "secondary"
  },
  OPEN: { 
    label: "Abierta", 
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80",
    variant: "outline"
  },
  IN_PROGRESS: { 
    label: "En Proceso", 
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80 font-medium",
    variant: "outline"
  },
  DONE: { 
    label: "Terminada", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 font-medium",
    variant: "outline"
  },
  CANCELLED: { 
    label: "Cancelada", 
    className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80",
    variant: "destructive"
  },
};

type CatalogOption = { value: string; label: string; color?: string | null };

export function StatusBadge({ estado, className, options }: { estado: EstadoOT; className?: string; options?: CatalogOption[] }) {
  const { label, className: configClassName, variant } = config[estado];
  const labelFromCatalog = options?.find(o => o.value === estado)?.label;
  return (
    <Badge 
      variant={variant || "default"} 
      className={cn(configClassName, className)}
    >
      {labelFromCatalog || label}
    </Badge>
  );
}
