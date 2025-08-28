"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, BarChart3, ListTodo, Clock, Trophy } from "lucide-react";
import { KPIDashboard } from "./kpi-dashboard";
import { ProductionCharts } from "./production-charts";
import { WIPTable } from "./wip-table";
import { UnifiedRegistration } from "./unified-registration";
import { RankingTabs } from "./ranking-tabs";
import { useAutoRefresh, useTimeAgo } from "./hooks";
import type { Overview, QuickLog, Actions } from "./types";

interface ControlDashboardProps {
  canWrite: boolean;
  overview: Overview;
  quicklog: QuickLog;
  actions: Actions;
  onRefresh?: () => void;
}

export function ControlDashboard({ 
  canWrite, 
  overview, 
  quicklog, 
  actions, 
  onRefresh 
}: ControlDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // Auto-refresh cada 30 segundos si está habilitado
  const { lastRefresh, isRefreshing, forceRefresh } = useAutoRefresh(
    () => onRefresh?.(),
    30000,
    autoRefreshEnabled && !!onRefresh
  );

  const timeAgo = useTimeAgo(lastRefresh);

  const handleRefresh = async () => {
    if (onRefresh) {
      forceRefresh();
    }
  };

  const getTabBadge = (tab: string) => {
    switch (tab) {
      case "wip":
        return overview.wip.length;
      case "registros":
        return canWrite ? quicklog.ots.length : 0;
      case "ranking":
        return overview.machines.length + overview.operators.length;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Control de Producción
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoreo y registro de actividades de producción
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-actualizar:</span>
            <Switch
              checked={autoRefreshEnabled}
              onCheckedChange={setAutoRefreshEnabled}
              disabled={!onRefresh}
            />
          </div>
          
          <Badge variant="outline" className="text-xs">
            {timeAgo}
          </Badge>
          
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          )}
        </div>
      </div>

      {/* KPIs Dashboard */}
      <KPIDashboard overview={overview} />

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Panel</span>
          </TabsTrigger>
          
          <TabsTrigger value="wip" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">WIP</span>
            <span className="sm:hidden">OTs</span>
            {getTabBadge("wip") && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {getTabBadge("wip")}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="registros" 
            className="flex items-center gap-2"
            disabled={!canWrite}
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Registro</span>
            <span className="sm:hidden">Reg</span>
            {canWrite && getTabBadge("registros") && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {getTabBadge("registros")}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
            <span className="sm:hidden">Rank</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <ProductionCharts overview={overview} />
        </TabsContent>

        {/* WIP Tab */}
        <TabsContent value="wip" className="mt-6">
          <WIPTable wip={overview.wip} />
        </TabsContent>

        {/* Quick Registration Tab */}
        <TabsContent value="registros" className="mt-6">
          <UnifiedRegistration 
            quicklog={quicklog}
            actions={actions}
            canWrite={canWrite}
          />
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="mt-6">
          <RankingTabs 
            machines={overview.machines}
            operators={overview.operators}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
