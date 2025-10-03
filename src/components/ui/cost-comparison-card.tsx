"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Settings, 
  TrendingUp, 
  Zap
} from "lucide-react";

type CostComparisonProps = {
  params: {
    id: string;
    key: string;
    label: string | null;
    valueNumber: string | null;
  }[];
};

export function CostComparisonCard({ params }: CostComparisonProps) {
  // Extraer valores necesarios
  const laborParalelo = Number(params.find(p => p.key === "laborCost_paralelo")?.valueNumber || 0);
  const laborCNC = Number(params.find(p => p.key === "laborCost_cnc")?.valueNumber || 0);
  const deprParalelo = Number(params.find(p => p.key === "deprPerHour_paralelo")?.valueNumber || 0);
  const deprCNC = Number(params.find(p => p.key === "deprPerHour_cnc")?.valueNumber || 0);
  const luz = Number(params.find(p => p.key === "kwhRate")?.valueNumber || 0);
  const alquiler = Number(params.find(p => p.key === "rentPerHour")?.valueNumber || 0);
  const tipoCambio = Number(params.find(p => p.key === "usdRate")?.valueNumber || 3.5);

  // Calcular totales
  const totalParalelo = laborParalelo + deprParalelo + luz + alquiler;
  const totalCNC = laborCNC + deprCNC + luz + alquiler;
  const diferencia = totalCNC - totalParalelo;
  const porcentajeDif = totalParalelo > 0 ? ((diferencia / totalParalelo) * 100) : 0;

  if (laborParalelo === 0 && laborCNC === 0) {
    return null; // No mostrar si no hay datos
  }

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      <div className="px-6 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Comparación de Costos por Tipo de Máquina</h3>
            <p className="text-sm text-muted-foreground">
              Análisis de costos diferenciados según gerencia (Tipo de cambio: {tipoCambio.toFixed(2)} PEN/USD)
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TORNO PARALELO */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-base">TORNO PARALELO</h4>
                <p className="text-xs text-muted-foreground">Costos operativos por hora</p>
              </div>
            </div>

            <div className="space-y-2 pl-4 border-l-2 border-blue-200">
              <CostRow 
                label="Mano de Obra" 
                usd={laborParalelo} 
                pen={laborParalelo * tipoCambio} 
              />
              <CostRow 
                label="Depreciación" 
                usd={deprParalelo} 
                pen={deprParalelo * tipoCambio} 
              />
              <CostRow 
                label="Energía (LUZ)" 
                usd={luz} 
                pen={luz * tipoCambio} 
                isShared 
              />
              <CostRow 
                label="Alquiler" 
                usd={alquiler} 
                pen={alquiler * tipoCambio} 
                isShared 
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-blue-200">
              <span className="font-semibold text-sm">TOTAL POR HORA:</span>
              <div className="text-right">
                <p className="font-bold text-lg text-blue-700">
                  ${totalParalelo.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(totalParalelo * tipoCambio).toFixed(2)} PEN
                </p>
              </div>
            </div>
          </div>

          {/* TORNO CNC */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-base">TORNO CNC</h4>
                <p className="text-xs text-muted-foreground">Costos operativos por hora</p>
              </div>
            </div>

            <div className="space-y-2 pl-4 border-l-2 border-purple-200">
              <CostRow 
                label="Mano de Obra" 
                usd={laborCNC} 
                pen={laborCNC * tipoCambio} 
              />
              <CostRow 
                label="Depreciación" 
                usd={deprCNC} 
                pen={deprCNC * tipoCambio} 
              />
              <CostRow 
                label="Energía (LUZ)" 
                usd={luz} 
                pen={luz * tipoCambio} 
                isShared 
              />
              <CostRow 
                label="Alquiler" 
                usd={alquiler} 
                pen={alquiler * tipoCambio} 
                isShared 
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-purple-200">
              <span className="font-semibold text-sm">TOTAL POR HORA:</span>
              <div className="text-right">
                <p className="font-bold text-lg text-purple-700">
                  ${totalCNC.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(totalCNC * tipoCambio).toFixed(2)} PEN
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Diferencia */}
        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Diferencia CNC vs PARALELO</p>
                <p className="text-xs text-muted-foreground">Costo adicional por hora</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl text-amber-700">
                +${diferencia.toFixed(2)}
              </p>
              <div className="flex items-center gap-2 justify-end">
                <Badge variant="secondary" className="text-xs">
                  +{porcentajeDif.toFixed(1)}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ({(diferencia * tipoCambio).toFixed(2)} PEN)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Los valores en PEN (Moneda Nacional) son informativos y se calculan 
            usando el tipo de cambio configurado. Los cálculos del sistema se realizan en USD.
          </p>
        </div>
      </div>
    </Card>
  );
}

function CostRow({ 
  label, 
  usd, 
  pen, 
  isShared = false 
}: { 
  label: string; 
  usd: number; 
  pen: number; 
  isShared?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        {isShared && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            compartido
          </Badge>
        )}
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">
          ${usd.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">
          {pen.toFixed(2)} PEN
        </p>
      </div>
    </div>
  );
}
