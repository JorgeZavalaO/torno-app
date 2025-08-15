"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Factory, Users2, Trophy, Medal, Award } from "lucide-react";
import type { MachineRow, OperatorRow } from "./types";

interface RankingTabsProps {
  machines: MachineRow[];
  operators: OperatorRow[];
}

interface RankingCardProps {
  title: string;
  icon: React.ReactNode;
  data: Array<{ name: string; value: number }>;
  totalLabel: string;
  unit: string;
}

function RankingCard({ title, icon, data, totalLabel, unit }: RankingCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map(item => item.value));

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1: return <Medal className="h-4 w-4 text-gray-400" />;
      case 2: return <Award className="h-4 w-4 text-amber-600" />;
      default: return <div className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">#{index + 1}</div>;
    }
  };

  const getProgressColor = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500";
      case 1: return "bg-gray-400";
      case 2: return "bg-amber-600";
      default: return "bg-primary";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {totalLabel}: {total.toFixed(1)} {unit}
        </Badge>
      </div>
      
      {data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            {icon}
            <span>Sin datos disponibles</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {data.map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            
            return (
              <div key={item.name} className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getRankIcon(index)}
                  <span className="font-medium truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-1 min-w-0">
                    <Progress 
                      value={percentage} 
                      className="h-2"
                      style={{
                        '--progress-foreground': getProgressColor(index)
                      } as React.CSSProperties}
                    />
                  </div>
                  <div className="text-right font-mono font-medium text-sm min-w-fit">
                    {item.value.toFixed(2)} {unit}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

interface DetailedRankingTableProps {
  title: string;
  icon: React.ReactNode;
  data: Array<{ name: string; value: number }>;
  unit: string;
  columns: { name: string; value: string };
}

function DetailedRankingTable({ title, icon, data, unit, columns }: DetailedRankingTableProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const average = data.length > 0 ? total / data.length : 0;

  const getRankBadge = (index: number) => {
    if (index < 3) {
      const colors = ["bg-yellow-100 text-yellow-800", "bg-gray-100 text-gray-800", "bg-amber-100 text-amber-800"];
      return (
        <Badge className={`${colors[index]} font-semibold`}>
          #{index + 1}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        #{index + 1}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">
              Promedio: {average.toFixed(2)} {unit}
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          Total: {total.toFixed(1)} {unit}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-16 text-center font-semibold">Rank</TableHead>
              <TableHead className="font-semibold">{columns.name}</TableHead>
              <TableHead className="text-right font-semibold">{columns.value}</TableHead>
              <TableHead className="text-right font-semibold">% del Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              
              return (
                <TableRow key={item.name} className="hover:bg-muted/30">
                  <TableCell className="text-center">
                    {getRankBadge(index)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.value.toFixed(2)} {unit}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  Sin datos disponibles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function RankingTabs({ machines, operators }: RankingTabsProps) {
  const topMachines = machines.slice(0, 10);
  const topOperators = operators.slice(0, 10);

  const machinesData = topMachines.map(m => ({ name: m.maquina, value: m.horas }));
  const operatorsData = topOperators.map(o => ({ name: o.usuario, value: o.horas }));

  return (
    <div className="space-y-6">
      {/* Cards resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankingCard
          title="Top Máquinas"
          icon={<Factory className="h-5 w-5" />}
          data={machinesData}
          totalLabel="Total"
          unit="h"
        />
        
        <RankingCard
          title="Top Operadores"
          icon={<Users2 className="h-5 w-5" />}
          data={operatorsData}
          totalLabel="Total"
          unit="h"
        />
      </div>

      {/* Tablas detalladas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DetailedRankingTable
          title="Ranking Detallado - Máquinas"
          icon={<Factory className="h-5 w-5" />}
          data={machinesData}
          unit="h"
          columns={{ name: "Máquina", value: "Horas" }}
        />
        
        <DetailedRankingTable
          title="Ranking Detallado - Operadores"
          icon={<Users2 className="h-5 w-5" />}
          data={operatorsData}
          unit="h"
          columns={{ name: "Operador", value: "Horas" }}
        />
      </div>
    </div>
  );
}
