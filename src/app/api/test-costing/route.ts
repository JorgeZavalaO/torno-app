import { NextResponse } from "next/server";
import { getCostingParamsGrouped, getCostsByMachineType } from "@/app/server/queries/costing-params";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Obtener parámetros agrupados
    const grouped = await getCostingParamsGrouped();
    
    // 2. Obtener costos por tipo de máquina
    const costosParalelo = await getCostsByMachineType("PARALELO");
    const costosCNC = await getCostsByMachineType("CNC");
    const costosLegacy = await getCostsByMachineType(null);

    // 3. Calcular totales por hora
    const totalHoraParalelo = 
      costosParalelo.laborCost + 
      costosParalelo.deprPerHour + 
      costosParalelo.kwhRate + 
      costosParalelo.rentPerHour;
    
    const totalHoraCNC = 
      costosCNC.laborCost + 
      costosCNC.deprPerHour + 
      costosCNC.kwhRate + 
      costosCNC.rentPerHour;

    // 4. Calcular diferencias
    const diferencias = {
      manoObra: {
        absoluta: costosCNC.laborCost - costosParalelo.laborCost,
        porcentual: ((costosCNC.laborCost - costosParalelo.laborCost) / costosParalelo.laborCost * 100)
      },
      depreciacion: {
        absoluta: costosCNC.deprPerHour - costosParalelo.deprPerHour,
        porcentual: ((costosCNC.deprPerHour - costosParalelo.deprPerHour) / costosParalelo.deprPerHour * 100)
      },
      total: {
        absoluta: totalHoraCNC - totalHoraParalelo,
        porcentual: ((totalHoraCNC - totalHoraParalelo) / totalHoraParalelo * 100)
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        parametrosAgrupados: grouped,
        costosPorTipo: {
          paralelo: {
            ...costosParalelo,
            totalPorHora: totalHoraParalelo
          },
          cnc: {
            ...costosCNC,
            totalPorHora: totalHoraCNC
          },
          legacy: costosLegacy
        },
        analisisComparativo: diferencias,
        resumen: {
          paralelo: {
            descripcion: "TORNO PARALELO",
            manoObra: `$${costosParalelo.laborCost.toFixed(2)}/hora (12.00 PEN)`,
            depreciacion: `$${costosParalelo.deprPerHour.toFixed(2)}/hora (0.30 PEN)`,
            luz: `$${costosParalelo.kwhRate.toFixed(2)}/hora (2.50 PEN)`,
            totalHora: `$${totalHoraParalelo.toFixed(2)} USD/hora`
          },
          cnc: {
            descripcion: "TORNO CNC",
            manoObra: `$${costosCNC.laborCost.toFixed(2)}/hora (19.00 PEN)`,
            depreciacion: `$${costosCNC.deprPerHour.toFixed(2)}/hora (1.60 PEN)`,
            luz: `$${costosCNC.kwhRate.toFixed(2)}/hora (2.50 PEN)`,
            totalHora: `$${totalHoraCNC.toFixed(2)} USD/hora`
          },
          diferencia: {
            manoObra: `+$${diferencias.manoObra.absoluta.toFixed(2)} (${diferencias.manoObra.porcentual.toFixed(1)}%)`,
            depreciacion: `+$${diferencias.depreciacion.absoluta.toFixed(2)} (${diferencias.depreciacion.porcentual.toFixed(1)}%)`,
            total: `+$${diferencias.total.absoluta.toFixed(2)} (${diferencias.total.porcentual.toFixed(1)}%)`
          }
        }
      }
    });

  } catch (error) {
    console.error("Error en endpoint de prueba:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      },
      { status: 500 }
    );
  }
}
