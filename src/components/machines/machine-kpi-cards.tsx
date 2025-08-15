"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Wrench, TrendingUp, Calendar } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface KPIData {
  horas30d: number;
  usoPctAprox: number;
  pendMant: number;
}

interface ChartData {
  day: string;
  horas: number;
}

interface MachineKPICardsProps {
  kpis: KPIData;
  chartData: ChartData[];
}

export function MachineKPICards({ kpis, chartData }: MachineKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Horas (30 días)</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.horas30d.toFixed(1)}h</div>
          <p className="text-xs text-muted-foreground">
            Uso aprox.: {kpis.usoPctAprox.toFixed(0)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mantenimientos</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{kpis.pendMant}</div>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {kpis.usoPctAprox > 80 ? "Alta" : kpis.usoPctAprox > 50 ? "Media" : "Baja"}
          </div>
          <p className="text-xs text-muted-foreground">Última semana</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tendencia (30 días)</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="horas" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip 
                  labelFormatter={(label) => `Día: ${label}`}
                  formatter={(value: number) => [`${value.toFixed(1)}h`, "Horas"]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
