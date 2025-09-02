import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Palette, Brush, Sparkles, Wrench } from "lucide-react";

// Mapeo de acabados comunes a íconos y colores
const acabadoConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  // Acabados principales del selector
  "ZINCADO": {
    icon: Sparkles,
    className: "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100/80"
  },
  "TROPICALIZADO": {
    icon: Brush,
    className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100/80"
  },
  "PINTADO": {
    icon: Palette,
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80"
  },
  // Acabados adicionales comunes
  "CROMADO": {
    icon: Sparkles,
    className: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80"
  },
  "NATURAL": {
    icon: Wrench,
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80"
  },
  "SIN ACABADO": {
    icon: Wrench,
    className: "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100/80"
  }
};

// Función para obtener la configuración basada en el texto del acabado
function getAcabadoConfig(acabado: string) {
  const upperAcabado = acabado.toUpperCase();
  
  // Buscar coincidencia exacta primero
  if (acabadoConfig[upperAcabado]) {
    return acabadoConfig[upperAcabado];
  }
  
  // Buscar coincidencias parciales
  for (const [key, config] of Object.entries(acabadoConfig)) {
    if (upperAcabado.includes(key) || key.includes(upperAcabado)) {
      return config;
    }
  }
  
  // Configuración por defecto
  return {
    icon: Palette,
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/80"
  };
}

export function AcabadoBadge({ 
  acabado, 
  className, 
  showIcon = true 
}: { 
  acabado: string; 
  className?: string;
  showIcon?: boolean;
}) {
  const { icon: Icon, className: configClassName } = getAcabadoConfig(acabado);
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium text-xs",
        configClassName, 
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1.5" />}
      <span className="capitalize">{acabado.toLowerCase()}</span>
    </Badge>
  );
}

export function AcabadoDisplay({ acabado }: { acabado: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs text-muted-foreground font-medium">Acabado:</span>
      <AcabadoBadge acabado={acabado} />
    </div>
  );
}
