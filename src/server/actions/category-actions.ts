"use server";

import { revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  upsertMachineCostingCategory,
  deleteMachineCostingCategory,
} from "@/app/server/queries/machine-costing-categories";

/**
 * Crea o actualiza una categoría de costeo de máquina
 */
export async function upsertCategoryAction(formData: FormData) {
  try {
    const categoria = formData.get("categoria") as string;
    const laborCost = parseFloat(formData.get("laborCost") as string);
    const deprPerHour = parseFloat(formData.get("deprPerHour") as string);
    const descripcion = formData.get("descripcion") as string;
    const activo = formData.get("activo") === "true";

    if (!categoria || isNaN(laborCost) || isNaN(deprPerHour)) {
      return {
        ok: false,
        message: "Datos inválidos. Verifica los campos requeridos.",
      };
    }

    const result = await upsertMachineCostingCategory({
      categoria,
      laborCost,
      deprPerHour,
      descripcion: descripcion || undefined,
      activo,
    });

    if (result.ok) {
      revalidateTag(cacheTags.costing);
      return {
        ok: true,
        message: `Categoría "${categoria}" guardada correctamente`,
      };
    }

    return {
      ok: false,
      message: result.error || "Error al guardar la categoría",
    };
  } catch (error) {
    console.error("Error in upsertCategoryAction:", error);
    return {
      ok: false,
      message: "Error al procesar la solicitud",
    };
  }
}

/**
 * Elimina (desactiva) una categoría de costeo
 */
export async function deleteCategoryAction(formData: FormData) {
  try {
    const categoria = formData.get("categoria") as string;

    if (!categoria) {
      return {
        ok: false,
        message: "Categoría no especificada",
      };
    }

    const result = await deleteMachineCostingCategory(categoria);

    if (result.ok) {
      revalidateTag(cacheTags.costing);
      return {
        ok: true,
        message: `Categoría "${categoria}" desactivada correctamente`,
      };
    }

    return {
      ok: false,
      message: result.error || "Error al desactivar la categoría",
    };
  } catch (error) {
    console.error("Error in deleteCategoryAction:", error);
    return {
      ok: false,
      message: "Error al procesar la solicitud",
    };
  }
}

/**
 * Sincroniza categorías desde las máquinas registradas
 */
export async function syncCategoriesFromMachines() {
  try {
    const { getRegisteredMachineCategories, getMachineCostingCategory, upsertMachineCostingCategory } = await import(
      "@/app/server/queries/machine-costing-categories"
    );
    
    const registeredCategories = await getRegisteredMachineCategories();
    let created = 0;

    for (const categoria of registeredCategories) {
      const existing = await getMachineCostingCategory(categoria);
      
      if (!existing) {
        // Crear con valores por defecto
        await upsertMachineCostingCategory({
          categoria,
          laborCost: 3.0, // USD/hora por defecto
          deprPerHour: 0.5, // USD/hora por defecto
          descripcion: `Categoría sincronizada automáticamente desde máquinas registradas`,
          activo: true,
        });
        created++;
      }
    }

    revalidateTag(cacheTags.costing);

    return {
      ok: true,
      message: created > 0 
        ? `${created} categoría(s) sincronizada(s) desde las máquinas`
        : "Todas las categorías ya están registradas",
      created,
    };
  } catch (error) {
    console.error("Error in syncCategoriesFromMachines:", error);
    return {
      ok: false,
      message: "Error al sincronizar categorías",
    };
  }
}

/**
 * Convierte los precios de todas las categorías cuando cambia la moneda del sistema
 * Esta función es llamada desde parametros-actions.ts cuando se cambia la moneda
 */
export async function convertCategoryCurrency(fromCurrency: string, toCurrency: string, usdRate: number) {
  try {
    // Solo convertir entre USD y PEN
    const validConversion = 
      (fromCurrency === "USD" && toCurrency === "PEN") || 
      (fromCurrency === "PEN" && toCurrency === "USD");
    
    if (!validConversion) {
      return { ok: true, message: "No se requiere conversión" };
    }

    // Obtener todas las categorías activas
    const categories = await prisma.machineCostingCategory.findMany({
      where: { activo: true },
    });

    if (categories.length === 0) {
      return { ok: true, message: "No hay categorías para convertir" };
    }

    // Preparar las actualizaciones
    const updates = categories.map(category => {
      const currentLaborCost = Number(category.laborCost.toString());
      const currentDeprPerHour = Number(category.deprPerHour.toString());
      
      // Convertir valores según la dirección
      const newLaborCost = toCurrency === "USD" 
        ? currentLaborCost / usdRate  // PEN -> USD
        : currentLaborCost * usdRate; // USD -> PEN
        
      const newDeprPerHour = toCurrency === "USD"
        ? currentDeprPerHour / usdRate  // PEN -> USD  
        : currentDeprPerHour * usdRate; // USD -> PEN

      return prisma.machineCostingCategory.update({
        where: { id: category.id },
        data: {
          laborCost: new Prisma.Decimal(newLaborCost),
          deprPerHour: new Prisma.Decimal(newDeprPerHour),
        },
      });
    });

    // Ejecutar todas las actualizaciones en una transacción
    await prisma.$transaction(updates);

    revalidateTag(cacheTags.costing);

    return {
      ok: true,
      message: `${categories.length} categoría(s) convertida(s) de ${fromCurrency} a ${toCurrency}`,
    };
  } catch (error) {
    console.error("Error converting category currency:", error);
    return {
      ok: false,
      message: "Error al convertir categorías",
    };
  }
}
