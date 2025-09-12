import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUp, Minus, Zap } from "lucide-react";

export type Prioridad = "LOW"|"MEDIUM"|"HIGH"|"URGENT";

const config: Record<Prioridad, { 
  label: string; 
  className: string; 
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "secondary" | "destructive" | "outline" 
}> = {
  LOW: { 
    label: "Baja", 
    className: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/80",
    icon: Minus,
    variant: "outline"
  },
  MEDIUM: { 
    label: "Media", 
    className: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/80",
    icon: ArrowUp,
    variant: "outline"
  },
  HIGH: { 
    label: "Alta", 
    className: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100/80 font-medium",
    icon: AlertTriangle,
    variant: "outline"
  },
  URGENT: { 
    label: "Urgente", 
    className: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/80 font-medium",
    icon: Zap,
    variant: "destructive"
  },
};

type CatalogOption = { value: string; label: string; color?: string | null; icono?: string | null };

export function PriorityBadge({ prioridad, className, showIcon = true, options }: { 
  prioridad: Prioridad; 
  className?: string;
  showIcon?: boolean;
  options?: CatalogOption[];
}) {
  const { label, className: configClassName, icon: Icon, variant } = config[prioridad];
  const labelFromCatalog = options?.find(o => o.value === prioridad)?.label;
  return (
    <Badge 
      variant={variant || "default"} 
      className={cn(configClassName, className)}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {labelFromCatalog || label}
    </Badge>
  );
}
