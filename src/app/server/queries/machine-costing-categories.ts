import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";
import { Prisma } from "@prisma/client";

/**
 * Valores por defecto para categorías comunes
 */
const DEFAULT_CATEGORIES = [
  {
    categoria: "TORNO PARALELO",
    laborCost: new Prisma.Decimal("3.43"),
    deprPerHour: new Prisma.Decimal("0.09"),
    descripcion: "Costos para torno paralelo convencional (12.00 PEN/h mano de obra, 0.30 PEN/h depreciación)",
    activo: true,
  },
  {
    categoria: "TORNO CNC",
    laborCost: new Prisma.Decimal("5.43"),
    deprPerHour: new Prisma.Decimal("0.46"),
    descripcion: "Costos para torno CNC (19.00 PEN/h mano de obra, 1.60 PEN/h depreciación)",
    activo: true,
  },
] as const;

/**
 * Asegura que existan categorías por defecto
 */
async function ensureDefaultCategories() {
  try {
    const existing = await prisma.machineCostingCategory.findMany({
      select: { categoria: true },
      where: {
        categoria: {
          in: DEFAULT_CATEGORIES.map((c) => c.categoria),
        },
      },
    });

    const existingCategorias = new Set(existing.map((e) => e.categoria));
    const missing = DEFAULT_CATEGORIES.filter(
      (c) => !existingCategorias.has(c.categoria)
    );

    if (missing.length > 0) {
      await prisma.machineCostingCategory.createMany({
        data: missing,
        skipDuplicates: true,
      });
    }
  } catch (error) {
    console.error("Error ensuring default machine costing categories:", error);
    throw new Error("Failed to initialize machine costing categories");
  }
}

/**
 * Obtiene todas las categorías de costeo activas
 */
export const getMachineCostingCategories = cache(
  async () => {
    try {
      await ensureDefaultCategories();

      const categories = await prisma.machineCostingCategory.findMany({
        where: { activo: true },
        orderBy: { categoria: "asc" },
        select: {
          id: true,
          categoria: true,
          laborCost: true,
          deprPerHour: true,
          descripcion: true,
          activo: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return categories;
    } catch (error) {
      console.error("Error fetching machine costing categories:", error);
      throw error;
    }
  },
  ["machine-costing:categories"],
  {
    tags: [cacheTags.costing],
    revalidate: 3600,
  }
);

/**
 * Obtiene todas las categorías (incluyendo inactivas)
 */
export const getAllMachineCostingCategories = cache(
  async () => {
    try {
      await ensureDefaultCategories();

      const categories = await prisma.machineCostingCategory.findMany({
        orderBy: { categoria: "asc" },
      });

      return categories;
    } catch (error) {
      console.error("Error fetching all machine costing categories:", error);
      throw error;
    }
  },
  ["machine-costing:categories:all"],
  {
    tags: [cacheTags.costing],
    revalidate: 3600,
  }
);

/**
 * Obtiene una categoría específica por nombre
 */
export async function getMachineCostingCategory(categoria: string) {
  try {
    const category = await prisma.machineCostingCategory.findUnique({
      where: { categoria },
    });

    return category;
  } catch (error) {
    console.error(`Error fetching machine costing category ${categoria}:`, error);
    return null;
  }
}

/**
 * Obtiene categorías únicas de las máquinas registradas
 */
export async function getRegisteredMachineCategories(): Promise<string[]> {
  try {
    const machines = await prisma.maquina.findMany({
      where: {
        categoria: { not: null },
      },
      select: { categoria: true },
      distinct: ["categoria"],
    });

    return machines
      .map((m) => m.categoria)
      .filter((c): c is string => c !== null)
      .sort();
  } catch (error) {
    console.error("Error fetching registered machine categories:", error);
    return [];
  }
}

/**
 * Obtiene los costos de una categoría específica
 * Si no existe, devuelve valores por defecto
 */
export async function getCostsByCategory(categoria: string | null) {
  if (!categoria) {
    // Si no hay categoría, usar valores generales de CostingParam
    const params = await prisma.costingParam.findMany({
      where: {
        key: {
          in: ["laborCost", "deprPerHour", "kwhRate", "toolingPerPiece", "rentPerHour", "gi", "margin"],
        },
      },
    });

    const values: Record<string, number> = {};
    for (const param of params) {
      values[param.key] = param.valueNumber ? Number(param.valueNumber.toString()) : 0;
    }

    return {
      laborCost: values.laborCost || 0,
      deprPerHour: values.deprPerHour || 0,
      kwhRate: values.kwhRate || 0,
      toolingPerPiece: values.toolingPerPiece || 0,
      rentPerHour: values.rentPerHour || 0,
      gi: values.gi || 0,
      margin: values.margin || 0,
    };
  }

  // Buscar categoría específica
  const categoryData = await getMachineCostingCategory(categoria);

  // Obtener parámetros compartidos
  const sharedParams = await prisma.costingParam.findMany({
    where: {
      key: {
        in: ["kwhRate", "toolingPerPiece", "rentPerHour", "gi", "margin"],
      },
    },
  });

  const sharedValues: Record<string, number> = {};
  for (const param of sharedParams) {
    sharedValues[param.key] = param.valueNumber ? Number(param.valueNumber.toString()) : 0;
  }

  if (categoryData) {
    return {
      laborCost: Number(categoryData.laborCost.toString()),
      deprPerHour: Number(categoryData.deprPerHour.toString()),
      kwhRate: sharedValues.kwhRate || 0,
      toolingPerPiece: sharedValues.toolingPerPiece || 0,
      rentPerHour: sharedValues.rentPerHour || 0,
      gi: sharedValues.gi || 0,
      margin: sharedValues.margin || 0,
    };
  }

  // Si no existe la categoría, usar valores legacy
  return {
    laborCost: sharedValues.laborCost || 0,
    deprPerHour: sharedValues.deprPerHour || 0,
    kwhRate: sharedValues.kwhRate || 0,
    toolingPerPiece: sharedValues.toolingPerPiece || 0,
    rentPerHour: sharedValues.rentPerHour || 0,
    gi: sharedValues.gi || 0,
    margin: sharedValues.margin || 0,
  };
}

/**
 * Crea o actualiza una categoría de costeo
 */
export async function upsertMachineCostingCategory(data: {
  categoria: string;
  laborCost: number;
  deprPerHour: number;
  descripcion?: string;
  activo?: boolean;
}) {
  try {
    const category = await prisma.machineCostingCategory.upsert({
      where: { categoria: data.categoria },
      create: {
        categoria: data.categoria,
        laborCost: new Prisma.Decimal(data.laborCost),
        deprPerHour: new Prisma.Decimal(data.deprPerHour),
        descripcion: data.descripcion,
        activo: data.activo ?? true,
      },
      update: {
        laborCost: new Prisma.Decimal(data.laborCost),
        deprPerHour: new Prisma.Decimal(data.deprPerHour),
        descripcion: data.descripcion,
        activo: data.activo,
      },
    });

    return { ok: true, category };
  } catch (error) {
    console.error("Error upserting machine costing category:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Elimina (desactiva) una categoría de costeo
 */
export async function deleteMachineCostingCategory(categoria: string) {
  try {
    await prisma.machineCostingCategory.update({
      where: { categoria },
      data: { activo: false },
    });

    return { ok: true };
  } catch (error) {
    console.error("Error deleting machine costing category:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Obtiene un resumen de categorías con estadísticas
 */
export async function getMachineCostingCategoriesWithStats() {
  try {
    const [categories, machines] = await Promise.all([
      getMachineCostingCategories(),
      prisma.maquina.groupBy({
        by: ["categoria"],
        _count: true,
        where: {
          categoria: { not: null },
        },
      }),
    ]);

    const machineCountByCategory = new Map(
      machines.map((m) => [m.categoria, m._count])
    );

    return categories.map((cat) => ({
      ...cat,
      machineCount: machineCountByCategory.get(cat.categoria) || 0,
    }));
  } catch (error) {
    console.error("Error fetching machine costing categories with stats:", error);
    throw error;
  }
}
