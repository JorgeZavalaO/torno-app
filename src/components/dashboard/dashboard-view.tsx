import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Settings, 
  Truck, 
  Package,
  DollarSign,
  AlertTriangle,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from "lucide-react";
import type { DashboardKPIs } from "@/app/server/queries/dashboard";

interface DashboardViewProps {
  kpis: DashboardKPIs;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('es-CL').format(num);
}

export function DashboardView({ kpis }: DashboardViewProps) {
  const { production, quotes, inventory, purchases, alerts } = kpis;
  
  // Calcular urgencia general
  const hasUrgentIssues = alerts.some(a => a.type === 'error');
  const hasWarnings = alerts.some(a => a.type === 'warning');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Resumen de actividades y KPIs del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUrgentIssues && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Atención requerida
            </Badge>
          )}
          {hasWarnings && !hasUrgentIssues && (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Avisos
            </Badge>
          )}
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="grid gap-4">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={alert.type === 'error' ? 'destructive' : 'default'}
              className={
                alert.type === 'warning' 
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                  : alert.type === 'info'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : ''
              }
            >
              {alert.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {alert.type === 'warning' && <AlertCircle className="h-4 w-4" />}
              {alert.type === 'info' && <Info className="h-4 w-4" />}
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Producción */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Órdenes de Trabajo
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Abiertas:</span>
                <span className="font-mono">{production.otOpen}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>En proceso:</span>
                <span className="font-mono">{production.otInProgress}</span>
              </div>
              {production.otUrgent > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Urgentes:</span>
                  <span className="font-mono font-bold">{production.otUrgent}</span>
                </div>
              )}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progreso general</span>
                  <span>{production.avanceGeneral}%</span>
                </div>
                <Progress value={production.avanceGeneral} className="h-2" />
              </div>
              <div className="pt-2 border-t">
                <Link href="/ot">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver OTs
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horas de Producción */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horas de Producción
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {formatNumber(production.horasHoy)}h
                </div>
                <p className="text-xs text-muted-foreground">Hoy</p>
              </div>
              <div>
                <div className="text-lg font-semibold text-muted-foreground">
                  {formatNumber(production.horasUlt7d)}h
                </div>
                <p className="text-xs text-muted-foreground">Últimos 7 días</p>
              </div>
              <div className="pt-2 border-t">
                <Link href="/control">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Control
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cotizaciones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cotizaciones
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Borrador: {quotes.totalDrafts}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>Enviadas: {quotes.totalPending}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Aprobadas: {quotes.totalApproved}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span>Rechazadas: {quotes.totalRejected}</span>
                </div>
              </div>
              
              {quotes.valorTotalApproved > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Valor aprobado:</div>
                  <div className="font-semibold">
                    {formatCurrency(quotes.valorTotalApproved)}
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <Link href="/cotizador">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Cotizaciones
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventario */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventario
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {formatNumber(inventory.totalProductos)}
                </div>
                <p className="text-xs text-muted-foreground">Total productos</p>
              </div>
              
              {inventory.productosStockBajo > 0 && (
                <div className="text-sm text-amber-600">
                  <AlertTriangle className="inline w-3 h-3 mr-1" />
                  {inventory.productosStockBajo} con stock bajo
                </div>
              )}
              
              <div className="text-sm">
                <span className="text-muted-foreground">Movimientos (7d):</span>
                <span className="ml-1 font-mono">{inventory.movimientosRecientes}</span>
              </div>
              
              {inventory.valorInventario > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Valor estimado:</span>
                  <div className="font-semibold">
                    {formatCurrency(inventory.valorInventario)}
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <Link href="/inventario">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Inventario
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compras Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solicitudes de Compra
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {purchases.scPendientes}
                </div>
                <p className="text-xs text-muted-foreground">Pendientes de aprobación</p>
              </div>
              
              <div className="text-sm">
                <span className="text-muted-foreground">OCs abiertas:</span>
                <span className="ml-1 font-mono">{purchases.ocAbiertas}</span>
              </div>
              
              <div className="pt-2 border-t">
                <Link href="/compras">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Compras
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compras Recientes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-lg font-bold">
                  {formatCurrency(purchases.valorComprasUlt30d)}
                </div>
                <p className="text-xs text-muted-foreground">Últimos 30 días</p>
              </div>
              
              <div className="pt-2 border-t">
                <Link href="/compras">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Reportes
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-center pt-6">
        <div className="flex gap-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span>Datos actualizados cada 5 minutos</span>
        </div>
      </div>
    </div>
  );
}
