import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";
import { Prisma } from "@prisma/client";

/** Enhanced defaults with better organization and validation */
const DEFAULTS: Omit<Prisma.CostingParamCreateInput, "id">[] = [
  // General settings
  { 
    key: "currency", 
    label: "Moneda base del sistema", 
    group: "general", 
    type: "TEXT", 
    valueText: "USD", 
    unit: "Código ISO-4217" 
  },
  // Tipo de cambio USD -> PEN (valor: PEN por 1 USD)
  {
    key: "usdRate",
    label: "Tipo de cambio USD → PEN",
    group: "general",
    type: "NUMBER",
    valueNumber: new Prisma.Decimal("3.50"),
    unit: "PEN por USD"
  },
  
  // Margin settings
  { 
    key: "gi", 
    label: "Gastos indirectos", 
    group: "margenes", 
    type: "PERCENT", 
    valueNumber: new Prisma.Decimal("0.15"), 
    unit: "% sobre costo directo" 
  },
  { 
    key: "margin", 
    label: "Margen de utilidad", 
    group: "margenes", 
    type: "PERCENT", 
    valueNumber: new Prisma.Decimal("0.20"), 
    unit: "% sobre costo total" 
  },
  
  // Operating costs - COMPARTIDOS (aplicables a todas las categorías)
  // NOTA: hourlyRate y deprPerHour ahora se obtienen de MachineCostingCategory
  { 
    key: "kwhRate", 
    label: "Costo de energía eléctrica por hora", 
    group: "costos_compartidos", 
    type: "CURRENCY", 
    valueNumber: new Prisma.Decimal("0.71"), 
    unit: "USD/hora" 
  },
  { 
    key: "toolingPerPiece", 
    label: "Desgaste de herramientas", 
    group: "costos_compartidos", 
    type: "CURRENCY", 
    valueNumber: new Prisma.Decimal("2.50"), 
    unit: "USD/pieza" 
  },
  { 
    key: "rentPerHour", 
    label: "Costo de alquiler del espacio", 
    group: "costos_compartidos", 
    type: "CURRENCY", 
    valueNumber: new Prisma.Decimal("10.00"), 
    unit: "USD/hora de operación" 
  },
];

/**
 * Ensures default parameters exist in the database
 * This function is idempotent and can be called safely multiple times
 */
async function ensureDefaults() {
  try {
    const existing = await prisma.costingParam.findMany({ 
      select: { key: true },
      where: {
        key: {
          in: DEFAULTS.map(d => d.key)
        }
      }
    });
    
    const existingKeys = new Set(existing.map(e => e.key));
    const missing = DEFAULTS.filter(d => !existingKeys.has(d.key));
    
    if (missing.length > 0) {
      console.log(`Creating ${missing.length} missing costing parameters`);
      
      await prisma.costingParam.createMany({
        data: missing.map(m => ({
          key: m.key,
          label: m.label,
          group: m.group,
          type: m.type,
          valueNumber: m.valueNumber ?? null,
          valueText: m.valueText ?? null,
          unit: m.unit ?? null,
        })),
        skipDuplicates: true, // Extra safety
      });
    }
  } catch (error) {
    console.error("Error ensuring default costing parameters:", error);
    throw new Error("Failed to initialize costing parameters");
  }
}

/**
 * Get all costing parameters with caching
 * Automatically ensures defaults exist before returning data
 */
export const getCostingParamsCached = cache(
  async () => {
    try {
      await ensureDefaults();
      
      const params = await prisma.costingParam.findMany({
        orderBy: [
          { group: "asc" },
          { key: "asc" }
        ],
        select: {
          id: true,
          key: true,
          label: true,
          group: true,
          type: true,
          valueNumber: true,
          valueText: true,
          unit: true,
        },
      });

      if (params.length === 0) {
        throw new Error("No costing parameters found after initialization");
      }

      return params;
    } catch (error) {
      console.error("Error fetching costing parameters:", error);
      throw error;
    }
  },
  ["costing:params"],
  { 
    tags: [cacheTags.costing],
    revalidate: 3600, // Cache for 1 hour
  }
);

/**
 * Get a specific parameter by key
 * Useful for individual parameter lookups
 */
export const getCostingParamByKey = cache(
  async (key: string) => {
    try {
      const param = await prisma.costingParam.findUnique({
        where: { key },
        select: {
          id: true,
          key: true,
          label: true,
          group: true,
          type: true,
          valueNumber: true,
          valueText: true,
          unit: true,
        },
      });

      return param;
    } catch (error) {
      console.error(`Error fetching costing parameter ${key}:`, error);
      throw error;
    }
  },
  ["costing:param"],
  { 
    tags: [cacheTags.costing],
    revalidate: 3600,
  }
);

/**
 * Get parameters organized by group
 * Useful for UI components that need grouped display
 */
export const getCostingParamsGrouped = cache(
  async () => {
    try {
      const params = await getCostingParamsCached();
      
      const grouped = params.reduce((acc, param) => {
        const group = param.group ?? "general";
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(param);
        return acc;
      }, {} as Record<string, typeof params>);

      return grouped;
    } catch (error) {
      console.error("Error grouping costing parameters:", error);
      throw error;
    }
  },
  ["costing:params:grouped"],
  { 
    tags: [cacheTags.costing],
    revalidate: 3600,
  }
);

/**
 * Get parameter values in a convenient format for calculations
 * Returns a flat object with key-value pairs
 */
export const getCostingValues = cache(
  async () => {
    try {
      const params = await getCostingParamsCached();
      
      const values: Record<string, string | number> = {};
      
      for (const param of params) {
        if (param.type === "TEXT") {
          values[param.key] = param.valueText ?? "";
        } else {
          values[param.key] = param.valueNumber ? Number(param.valueNumber.toString()) : 0;
        }
      }

      return values;
    } catch (error) {
      console.error("Error getting costing values:", error);
      throw error;
    }
  },
  ["costing:values"],
  { 
    tags: [cacheTags.costing],
    revalidate: 3600,
  }
);

/**
 * Validate that all required parameters exist
 * Useful for health checks and system validation
 */
export async function validateCostingParams(): Promise<{
  isValid: boolean;
  missingParams: string[];
  issues: string[];
}> {
  try {
    const params = await getCostingParamsCached();
    const paramKeys = new Set(params.map(p => p.key));
    const requiredKeys = new Set(DEFAULTS.map(d => d.key));
    
    const missingParams = [...requiredKeys].filter(key => !paramKeys.has(key));
    const issues: string[] = [];

    // Check for missing parameters
    if (missingParams.length > 0) {
      issues.push(`Missing required parameters: ${missingParams.join(", ")}`);
    }

    // Check for invalid values
    for (const param of params) {
      if (param.type === "PERCENT" && param.valueNumber) {
        const value = Number(param.valueNumber.toString());
        if (value < 0 || value > 1) {
          issues.push(`Invalid percentage value for ${param.key}: ${value * 100}%`);
        }
      } else if ((param.type === "CURRENCY" || param.type === "NUMBER") && param.valueNumber) {
        const value = Number(param.valueNumber.toString());
        if (value < 0) {
          issues.push(`Negative value for ${param.key}: ${value}`);
        }
      } else if (param.type === "TEXT" && (!param.valueText || param.valueText.trim() === "")) {
        issues.push(`Empty text value for ${param.key}`);
      }
    }

    return {
      isValid: missingParams.length === 0 && issues.length === 0,
      missingParams,
      issues,
    };
  } catch (error) {
    console.error("Error validating costing parameters:", error);
    return {
      isValid: false,
      missingParams: [],
      issues: ["Error during validation: " + (error as Error).message],
    };
  }
}

/**
 * Helper para obtener los costos específicos según el tipo de máquina
 * @deprecated Usar getCostsByCategory de machine-costing-categories.ts para mayor flexibilidad
 * @param tipoMaquina - Tipo de máquina: "PARALELO", "CNC", o null para valores legacy
 * @returns Objeto con los costos operativos de la máquina
 */
export async function getCostsByMachineType(tipoMaquina: "PARALELO" | "CNC" | null = null) {
  // Redirigir a la nueva implementación
  const { getCostsByCategory } = await import("./machine-costing-categories");
  
  if (tipoMaquina === "PARALELO") {
    return getCostsByCategory("TORNO PARALELO");
  } else if (tipoMaquina === "CNC") {
    return getCostsByCategory("TORNO CNC");
  }
  
  // Fallback a valores legacy si no se especifica tipo
  return getCostsByCategory(null);
}