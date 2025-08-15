import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Factory, 
  Timer, 
  Target,
  Activity
} from "lucide-react";
import type { Overview } from "./types";

interface KPICardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

function KPICard({ icon, title, value, trend, subtitle }: KPICardProps) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">{title}</div>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
            )}
          </div>
        </div>
        {trend && (
          <Badge 
            variant={trend.isPositive ? "default" : "secondary"}
            className="ml-2"
          >
            {trend.isPositive ? "+" : ""}{trend.value}%
          </Badge>
        )}
      </div>
    </Card>
  );
}

interface KPIDashboardProps {
  overview: Overview;
}

export function KPIDashboard({ overview }: KPIDashboardProps) {
  const { kpis } = overview;
  
  // Calcular tendencias simples (podrías mejorar esto con datos históricos)
  const avgDailyHours = kpis.horasUlt7d / 7;
  const todayVsAvg = avgDailyHours > 0 ? ((kpis.horasHoy - avgDailyHours) / avgDailyHours) * 100 : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <KPICard
        icon={<Timer className="h-5 w-5" />}
        title="Horas hoy"
        value={kpis.horasHoy.toFixed(1)}
        trend={{
          value: Math.round(todayVsAvg),
          isPositive: todayVsAvg >= 0
        }}
        subtitle="vs promedio semanal"
      />
      
      <KPICard
        icon={<TrendingUp className="h-5 w-5" />}
        title="Horas (7 días)"
        value={kpis.horasUlt7d.toFixed(1)}
        subtitle={`${(kpis.horasUlt7d / 7).toFixed(1)} promedio/día`}
      />
      
      <KPICard
        icon={<Activity className="h-5 w-5" />}
        title="OTs activas"
        value={String(kpis.otsInProgress)}
        subtitle={`${kpis.otsOpen} abiertas`}
      />
      
      <KPICard
        icon={<Target className="h-5 w-5" />}
        title="Avance global"
        value={`${kpis.avanceGlobalPct.toFixed(0)}%`}
        subtitle={`${kpis.piezasHechas}/${kpis.piezasPlan} piezas`}
      />
      
      <KPICard
        icon={<Factory className="h-5 w-5" />}
        title="Máquinas activas"
        value={String(overview.machines.filter(m => m.horas > 0).length)}
        subtitle={`${overview.machines.length} registradas`}
      />
    </div>
  );
}
