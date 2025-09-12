"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw } from "lucide-react";
import { WIPTable } from "./wip-table";
import { ProductionStats } from "./production-stats";
import { useAutoRefresh, useTimeAgo } from "./hooks";
import type { Overview, QuickLog, Actions } from "./types";

interface ControlDashboardProps {
  canWrite: boolean;
  overview: Overview;
  quicklog: QuickLog;
  actions: Actions;
  onRefresh?: () => void;
  prioridadOptions: { value: string; label: string; color?: string | null }[];
  estadoOptions: { value: string; label: string; color?: string | null }[];
}

export function ControlDashboard({ 
  canWrite, 
  overview, 
  quicklog, 
  actions, 
  onRefresh,
  prioridadOptions,
  estadoOptions,
}: ControlDashboardProps) {
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

  return (
    <div className="space-y-6">
      {/* Header simplificado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Control de Producción
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión y monitoreo de órdenes de trabajo
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

      {/* Estadísticas de producción */}
      <ProductionStats overview={overview} />

      {/* Vista única de órdenes de trabajo */}
      <div className="mt-6">
        <WIPTable 
          wip={overview.wip} 
          onRefresh={onRefresh}
          quicklog={quicklog}
          actions={actions}
          canWrite={canWrite}
          prioridadOptions={prioridadOptions}
          estadoOptions={estadoOptions}
        />
      </div>
    </div>
  );
}
