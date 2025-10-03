/**
 * EJEMPLO PRÁCTICO: Integración de costos diferenciados con módulo de OT
 * 
 * Este archivo muestra cómo integrar los nuevos parámetros de costeo
 * diferenciados en el cálculo de costos de Órdenes de Trabajo.
 */

import { getCostsByMachineType } from "@/app/server/queries/costing-params";

// ============================================================================
// EJEMPLO 1: Función de cálculo de costos para OT
// ============================================================================

export async function calcularCostosOT(input: {
  tipoMaquina: "PARALELO" | "CNC";
  horasTrabajo: number;
  cantidadPiezas: number;
  costoMateriales?: number;
}) {
  const {
    tipoMaquina,
    horasTrabajo,
    cantidadPiezas,
    costoMateriales = 0,
  } = input;

  // Obtener parámetros de costeo según tipo de máquina
  const costos = await getCostsByMachineType(tipoMaquina);

  // 1. COSTOS DE MANO DE OBRA
  const costoManoObra = costos.laborCost * horasTrabajo;

  // 2. COSTOS DE DEPRECIACIÓN
  const costoDepreciacion = costos.deprPerHour * horasTrabajo;

  // 3. COSTOS DE ENERGÍA (LUZ)
  const costoEnergia = costos.kwhRate * horasTrabajo;

  // 4. COSTOS DE ALQUILER
  const costoAlquiler = costos.rentPerHour * horasTrabajo;

  // 5. COSTOS DE HERRAMIENTAS
  const costoHerramientas = costos.toolingPerPiece * cantidadPiezas;

  // COSTO DIRECTO TOTAL
  const costoDirecto =
    costoManoObra +
    costoDepreciacion +
    costoEnergia +
    costoAlquiler +
    costoHerramientas +
    costoMateriales;

  // GASTOS INDIRECTOS (% sobre costo directo)
  const gastosIndirectos = costoDirecto * costos.gi;

  // COSTO TOTAL (directo + indirectos)
  const costoTotal = costoDirecto + gastosIndirectos;

  // PRECIO DE VENTA (con margen de utilidad)
  const precioVenta = costoTotal / (1 - costos.margin);

  return {
    tipoMaquina,
    horasTrabajo,
    cantidadPiezas,
    desglose: {
      manoObra: costoManoObra,
      depreciacion: costoDepreciacion,
      energia: costoEnergia,
      alquiler: costoAlquiler,
      herramientas: costoHerramientas,
      materiales: costoMateriales,
    },
    costoDirecto,
    gastosIndirectos,
    costoTotal,
    precioVenta,
    margenUtilidad: precioVenta - costoTotal,
    porcentajeMargen: costos.margin * 100,
  };
}

// ============================================================================
// EJEMPLO 2: Comparar costos entre tipos de máquina
// ============================================================================

export async function compararCostosMaquinas(input: {
  horasTrabajo: number;
  cantidadPiezas: number;
  costoMateriales?: number;
}) {
  const [costosParalelo, costosCNC] = await Promise.all([
    calcularCostosOT({ ...input, tipoMaquina: "PARALELO" }),
    calcularCostosOT({ ...input, tipoMaquina: "CNC" }),
  ]);

  const diferencia = costosCNC.precioVenta - costosParalelo.precioVenta;
  const porcentajeDif = (diferencia / costosParalelo.precioVenta) * 100;

  return {
    paralelo: costosParalelo,
    cnc: costosCNC,
    comparacion: {
      diferenciaPrecio: diferencia,
      porcentajeDiferencia: porcentajeDif,
      masEconomico: diferencia > 0 ? "PARALELO" : "CNC",
      ahorro: Math.abs(diferencia),
    },
  };
}

// ============================================================================
// EJEMPLO 3: Sugerir tipo de máquina óptimo
// ============================================================================

export async function sugerirMaquinaOptima(input: {
  horasTrabajo: number;
  cantidadPiezas: number;
  costoMateriales?: number;
  factores?: {
    priorizarCosto?: boolean; // true = más barato, false = más rápido
    velocidadCNC?: number; // Factor de velocidad CNC vs Paralelo (ej: 2.5 = 2.5x más rápido)
  };
}) {
  const { factores = {} } = input;
  const {
    priorizarCosto = true,
    velocidadCNC = 2.5, // CNC es ~2.5x más rápido que paralelo
  } = factores;

  // Comparación base (opcional para análisis adicional)
  // const comparacion = await compararCostosMaquinas(input);

  // Ajustar horas reales considerando velocidad
  const horasRealesParalelo = input.horasTrabajo;
  const horasRealesCNC = input.horasTrabajo / velocidadCNC;

  // Recalcular con horas reales
  const [costosAjustadoParalelo, costosAjustadoCNC] = await Promise.all([
    calcularCostosOT({
      ...input,
      tipoMaquina: "PARALELO",
      horasTrabajo: horasRealesParalelo,
    }),
    calcularCostosOT({
      ...input,
      tipoMaquina: "CNC",
      horasTrabajo: horasRealesCNC,
    }),
  ]);

  let recomendacion: "PARALELO" | "CNC";
  let razon: string;

  if (priorizarCosto) {
    // Recomendar la opción más económica
    if (costosAjustadoCNC.costoTotal <= costosAjustadoParalelo.costoTotal) {
      recomendacion = "CNC";
      razon = `Más económico considerando velocidad: ${costosAjustadoCNC.costoTotal.toFixed(2)} vs ${costosAjustadoParalelo.costoTotal.toFixed(2)} USD`;
    } else {
      recomendacion = "PARALELO";
      razon = `Más económico: ${costosAjustadoParalelo.costoTotal.toFixed(2)} vs ${costosAjustadoCNC.costoTotal.toFixed(2)} USD`;
    }
  } else {
    // Recomendar CNC si no se prioriza costo (por velocidad)
    recomendacion = "CNC";
    razon = `Más rápido: ${horasRealesCNC.toFixed(2)} horas vs ${horasRealesParalelo.toFixed(2)} horas`;
  }

  return {
    recomendacion,
    razon,
    analisis: {
      paralelo: {
        horasReales: horasRealesParalelo,
        costoTotal: costosAjustadoParalelo.costoTotal,
        precioVenta: costosAjustadoParalelo.precioVenta,
      },
      cnc: {
        horasReales: horasRealesCNC,
        costoTotal: costosAjustadoCNC.costoTotal,
        precioVenta: costosAjustadoCNC.precioVenta,
      },
      ahorroTiempo: horasRealesParalelo - horasRealesCNC,
      ahorroCosto:
        costosAjustadoParalelo.costoTotal - costosAjustadoCNC.costoTotal,
    },
  };
}

// ============================================================================
// EJEMPLO 4: Uso práctico en una ruta API o server action
// ============================================================================

export async function ejemploUsoEnAPI() {
  // Escenario: Cotización para fabricar 100 piezas
  // Estimado: 8 horas en torno paralelo
  // Materiales: $50 USD

  console.log("=".repeat(80));
  console.log("EJEMPLO DE CÁLCULO DE COSTOS POR TIPO DE MÁQUINA");
  console.log("=".repeat(80));
  console.log();

  // 1. Calcular con TORNO PARALELO
  console.log("📊 OPCIÓN 1: TORNO PARALELO");
  const resultadoParalelo = await calcularCostosOT({
    tipoMaquina: "PARALELO",
    horasTrabajo: 8,
    cantidadPiezas: 100,
    costoMateriales: 50,
  });

  console.log(`  Horas de trabajo: ${resultadoParalelo.horasTrabajo}`);
  console.log(`  Cantidad piezas: ${resultadoParalelo.cantidadPiezas}`);
  console.log();
  console.log("  Desglose de costos:");
  console.log(`    - Mano de obra:    $${resultadoParalelo.desglose.manoObra.toFixed(2)}`);
  console.log(`    - Depreciación:    $${resultadoParalelo.desglose.depreciacion.toFixed(2)}`);
  console.log(`    - Energía:         $${resultadoParalelo.desglose.energia.toFixed(2)}`);
  console.log(`    - Alquiler:        $${resultadoParalelo.desglose.alquiler.toFixed(2)}`);
  console.log(`    - Herramientas:    $${resultadoParalelo.desglose.herramientas.toFixed(2)}`);
  console.log(`    - Materiales:      $${resultadoParalelo.desglose.materiales.toFixed(2)}`);
  console.log(`    ─────────────────────────────`);
  console.log(`    COSTO DIRECTO:     $${resultadoParalelo.costoDirecto.toFixed(2)}`);
  console.log(`    Gastos indirectos: $${resultadoParalelo.gastosIndirectos.toFixed(2)}`);
  console.log(`    ─────────────────────────────`);
  console.log(`    COSTO TOTAL:       $${resultadoParalelo.costoTotal.toFixed(2)}`);
  console.log(`    PRECIO VENTA:      $${resultadoParalelo.precioVenta.toFixed(2)}`);
  console.log(`    Margen utilidad:   $${resultadoParalelo.margenUtilidad.toFixed(2)} (${resultadoParalelo.porcentajeMargen.toFixed(1)}%)`);
  console.log();

  // 2. Calcular con TORNO CNC
  console.log("📊 OPCIÓN 2: TORNO CNC");
  const resultadoCNC = await calcularCostosOT({
    tipoMaquina: "CNC",
    horasTrabajo: 8,
    cantidadPiezas: 100,
    costoMateriales: 50,
  });

  console.log(`  Horas de trabajo: ${resultadoCNC.horasTrabajo}`);
  console.log(`  Cantidad piezas: ${resultadoCNC.cantidadPiezas}`);
  console.log();
  console.log("  Desglose de costos:");
  console.log(`    - Mano de obra:    $${resultadoCNC.desglose.manoObra.toFixed(2)}`);
  console.log(`    - Depreciación:    $${resultadoCNC.desglose.depreciacion.toFixed(2)}`);
  console.log(`    - Energía:         $${resultadoCNC.desglose.energia.toFixed(2)}`);
  console.log(`    - Alquiler:        $${resultadoCNC.desglose.alquiler.toFixed(2)}`);
  console.log(`    - Herramientas:    $${resultadoCNC.desglose.herramientas.toFixed(2)}`);
  console.log(`    - Materiales:      $${resultadoCNC.desglose.materiales.toFixed(2)}`);
  console.log(`    ─────────────────────────────`);
  console.log(`    COSTO DIRECTO:     $${resultadoCNC.costoDirecto.toFixed(2)}`);
  console.log(`    Gastos indirectos: $${resultadoCNC.gastosIndirectos.toFixed(2)}`);
  console.log(`    ─────────────────────────────`);
  console.log(`    COSTO TOTAL:       $${resultadoCNC.costoTotal.toFixed(2)}`);
  console.log(`    PRECIO VENTA:      $${resultadoCNC.precioVenta.toFixed(2)}`);
  console.log(`    Margen utilidad:   $${resultadoCNC.margenUtilidad.toFixed(2)} (${resultadoCNC.porcentajeMargen.toFixed(1)}%)`);
  console.log();

  // 3. Comparación
  const diferencia = resultadoCNC.precioVenta - resultadoParalelo.precioVenta;
  console.log("📊 COMPARACIÓN");
  console.log(`  Diferencia de precio: $${Math.abs(diferencia).toFixed(2)}`);
  console.log(
    `  Opción más económica: ${diferencia > 0 ? "TORNO PARALELO" : "TORNO CNC"}`
  );
  console.log();

  // 4. Sugerencia inteligente
  console.log("💡 SUGERENCIA INTELIGENTE");
  const sugerencia = await sugerirMaquinaOptima({
    horasTrabajo: 8,
    cantidadPiezas: 100,
    costoMateriales: 50,
    factores: {
      priorizarCosto: true,
      velocidadCNC: 2.5,
    },
  });

  console.log(`  Recomendación: ${sugerencia.recomendacion}`);
  console.log(`  Razón: ${sugerencia.razon}`);
  console.log();
  console.log("  Análisis ajustado por velocidad:");
  console.log(`    PARALELO: ${sugerencia.analisis.paralelo.horasReales.toFixed(2)}h → $${sugerencia.analisis.paralelo.precioVenta.toFixed(2)}`);
  console.log(`    CNC:      ${sugerencia.analisis.cnc.horasReales.toFixed(2)}h → $${sugerencia.analisis.cnc.precioVenta.toFixed(2)}`);
  console.log(`    Ahorro de tiempo: ${sugerencia.analisis.ahorroTiempo.toFixed(2)} horas`);
  console.log(`    Diferencia de costo: $${Math.abs(sugerencia.analisis.ahorroCosto).toFixed(2)}`);
  console.log();
  console.log("=".repeat(80));

  return {
    paralelo: resultadoParalelo,
    cnc: resultadoCNC,
    sugerencia,
  };
}

// ============================================================================
// Ejecutar ejemplo (comentar en producción)
// ============================================================================

// Descomentar para probar:
// ejemploUsoEnAPI().then(() => console.log("✅ Ejemplo completado"));
