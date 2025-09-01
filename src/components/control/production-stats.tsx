"use client";

import { Card } from "@/components/ui/card";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp
} from "lucide-react";
import type { Overview } from "./types";

interface ProductionStatsProps {
  overview: Overview;
}

export function ProductionStats({ overview }: ProductionStatsProps) {
  // Calcular estadísticas básicas
  const totalOTs = overview.wip.length;
  const completedOTs = overview.wip.filter(ot => ot.avancePct === 100).length;
  const inProgressOTs = overview.wip.filter(ot => ot.estado === "IN_PROGRESS").length;
  const atRiskOTs = overview.wip.filter(ot => ot.avancePct < 25 && ot.estado !== "OPEN").length;
  
  const totalPlan = overview.wip.reduce((sum, ot) => sum + ot.piezasPlan, 0);
  const totalProduced = overview.wip.reduce((sum, ot) => sum + ot.piezasHechas, 0);
  const overallEfficiency = totalPlan > 0 ? (totalProduced / totalPlan) * 100 : 0;

  const stats = [
    {
      label: "Órdenes Activas",
      value: totalOTs,
      subValue: `${inProgressOTs} en proceso`,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completadas",
      value: completedOTs,
      subValue: `${((completedOTs / totalOTs) * 100 || 0).toFixed(1)}% del total`,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "En Riesgo",
      value: atRiskOTs,
      subValue: "Avance < 25%",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Eficiencia",
      value: `${overallEfficiency.toFixed(1)}%`,
      subValue: `${totalProduced.toLocaleString()}/${totalPlan.toLocaleString()} piezas`,
      icon: TrendingUp,
      color: overallEfficiency >= 80 ? "text-green-600" : overallEfficiency >= 60 ? "text-yellow-600" : "text-red-600",
      bgColor: overallEfficiency >= 80 ? "bg-green-50" : overallEfficiency >= 60 ? "bg-yellow-50" : "bg-red-50",
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color} mb-1`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.subValue}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <IconComponent className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
