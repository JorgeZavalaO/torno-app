"use client";

/**
 * Botón para recálculo manual de costos promedio ponderado.
 * 
 * NOTA: El sistema funciona automáticamente con cada recepción de OC.
 * Este botón es solo para casos excepcionales como:
 * - Correcciones manuales en BD
 * - Inconsistencias detectadas
 * - Actualizaciones masivas forzadas
 * 
 * En operación normal, NO es necesario usarlo.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { recalculateAllProductCosts } from "@/app/(protected)/compras/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function RecalculateCostsButton() {
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const result = await recalculateAllProductCosts();
      
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Error inesperado al recalcular costos");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
          Recalcular Costos
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Recalcular Costos (Manual)
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>
                <strong>Nota:</strong> Los costos se actualizan automáticamente con cada recepción de mercadería.
                Esta función es solo para casos especiales.
              </div>
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-sm text-blue-800">
                  <strong>💡 Cuándo usar:</strong>
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>Después de correcciones manuales en la base de datos</li>
                    <li>Si se detectan inconsistencias en los costos</li>
                    <li>Para forzar una actualización masiva</li>
                  </ul>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Esta acción recalculará el costo promedio de todos los productos basándose en su historial de compras.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleRecalculate}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Recalculando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Confirmar Recálculo
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}