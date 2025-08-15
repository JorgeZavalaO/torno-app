"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Users2 } from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import type { Overview } from "./types";

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

interface ProductionChartsProps {
  overview: Overview;
}

export function ProductionCharts({ overview }: ProductionChartsProps) {
  const { series, machines, operators } = overview;

  // Preparar datos para el gráfico de pie de máquinas
  const topMachines = machines.slice(0, 5);
  const otherMachinesHours = machines.slice(5).reduce((sum, m) => sum + m.horas, 0);
  const machinesPieData = [
    ...topMachines.map(m => ({ name: m.maquina, value: m.horas })),
    ...(otherMachinesHours > 0 ? [{ name: 'Otras', value: otherMachinesHours }] : [])
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Gráfico de horas por día */}
      <Card className="p-6 col-span-1 xl:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Evolución de Horas Trabajadas</h3>
          <Badge variant="outline">
            {series.length} días
          </Badge>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="horas" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Distribución por máquinas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Distribución por Máquinas
          </h3>
          <Badge variant="outline">
            {machines.length} máquinas
          </Badge>
        </div>
        
        {machinesPieData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={machinesPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent?: number }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {machinesPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)} horas`, 'Horas']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sin datos de máquinas
          </div>
        )}
      </Card>

      {/* Top operadores */}
      <Card className="p-6 col-span-1 xl:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Ranking de Operadores
          </h3>
          <Badge variant="outline">
            {operators.length} operadores
          </Badge>
        </div>
        
        {operators.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operators.slice(0, 10)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="usuario" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} horas`, 'Horas']}
                />
                <Bar 
                  dataKey="horas" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Sin datos de operadores
          </div>
        )}
      </Card>

      {/* Tabla resumida de máquinas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Máquinas</h3>
          <Badge variant="secondary">
            {machines.reduce((sum, m) => sum + m.horas, 0).toFixed(1)}h total
          </Badge>
        </div>
        
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Máquina</TableHead>
                <TableHead className="text-right font-semibold">Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.slice(0, 8).map((machine, index) => (
                <TableRow key={machine.maquina}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {machine.maquina}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {machine.horas.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                    Sin datos de máquinas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
