"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { TipoCatalogo } from "@prisma/client";
import { assertCanWriteCosting } from "@/app/lib/guards";

type Result = { ok: true; message?: string; id?: string } | { ok: false; message: string };

// Schema de validación
const CatalogoItemSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.nativeEnum(TipoCatalogo),
  codigo: z.string().min(1, "El código es requerido").max(50),
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  descripcion: z.string().max(500).optional().or(z.literal("")),
  orden: z.number().int().min(0).max(9999),
  activo: z.boolean().default(true),
  color: z.string().max(20).optional().or(z.literal("")),
  icono: z.string().max(50).optional().or(z.literal("")),
  // Campos específicos para tipos de trabajo
  isSubcategory: z.boolean().default(false),
  parent: z.string().optional().or(z.literal("")),
});

/**
 * Crear o actualizar un elemento del catálogo
 */
export async function upsertCatalogoItem(fd: FormData): Promise<Result> {
  try {
    await assertCanWriteCosting();

    // Fix para el switch: verificar explícitamente si el checkbox está presente
    const activoValue = fd.has("activo") ? fd.get("activo") === "on" || fd.get("activo") === "true" : false;

    // Función helper para obtener valores string seguros
    const getString = (name: string): string | undefined => {
      const value = fd.get(name);
      return value === null ? undefined : (value as string);
    };

    const parsed = CatalogoItemSchema.safeParse({
      id: getString("id"),
      tipo: getString("tipo"),
      codigo: getString("codigo"),
      nombre: getString("nombre"),
      descripcion: getString("descripcion"),
      orden: Number(getString("orden") || "0"),
      activo: activoValue,
      color: getString("color"),
      icono: getString("icono"),
      // Campos específicos para tipos de trabajo
      isSubcategory: getString("isSubcategory") === "true",
      parent: getString("parent"),
    });

    if (!parsed.success) {
      console.error("Validation error:", parsed.error.issues);
      console.error("Form data debug:", {
        tipo: getString("tipo"),
        codigo: getString("codigo"),
        nombre: getString("nombre"),
        descripcion: getString("descripcion"),
        orden: getString("orden"),
        activo: activoValue,
        color: getString("color"),
        icono: getString("icono"),
        isSubcategory: getString("isSubcategory"),
        parent: getString("parent"),
      });
      return { ok: false, message: `Error de validación: ${parsed.error.issues[0].message}` };
    }

    const data = parsed.data;

    // Construir propiedades JSON para tipos de trabajo
    let propiedades: { isSubcategory?: boolean; parent?: string | null } | undefined = undefined;
    if (data.tipo === TipoCatalogo.TIPO_TRABAJO && (data.isSubcategory || data.parent)) {
      propiedades = {
        isSubcategory: data.isSubcategory || false,
        parent: data.parent || null,
      };
    }

    // Si es edición, verificar que el elemento existe
    if (data.id) {
      const existing = await prisma.configuracionCatalogo.findUnique({
        where: { id: data.id },
      });
      
      if (!existing) {
        return { ok: false, message: "Elemento no encontrado" };
      }

      // Actualizar
      await prisma.configuracionCatalogo.update({
        where: { id: data.id },
        data: {
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          orden: data.orden,
          activo: data.activo ?? true,
          color: data.color || null,
          icono: data.icono || null,
          propiedades,
        },
      });

      revalidatePath("/admin/catalogos");
      return { ok: true, message: "Elemento actualizado correctamente" };
    } else {
      // Crear nuevo - verificar que no exista el código en ese tipo
      const existing = await prisma.configuracionCatalogo.findUnique({
        where: {
          tipo_codigo: {
            tipo: data.tipo,
            codigo: data.codigo,
          },
        },
      });

      if (existing) {
        return { ok: false, message: "Ya existe un elemento con ese código en este tipo de catálogo" };
      }

      // Orden automático: obtener el siguiente orden disponible
      let ordenFinal = data.orden;
      if (ordenFinal === 0) {
        const maxOrden = await prisma.configuracionCatalogo.aggregate({
          where: { tipo: data.tipo },
          _max: { orden: true },
        });
        ordenFinal = (maxOrden._max.orden || 0) + 1;
      }

      const created = await prisma.configuracionCatalogo.create({
        data: {
          tipo: data.tipo,
          codigo: data.codigo,
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          orden: ordenFinal,
          activo: data.activo ?? true,
          color: data.color || null,
          icono: data.icono || null,
          propiedades,
        },
      });

      revalidatePath("/admin/catalogos");
      return { ok: true, message: "Elemento creado correctamente", id: created.id };
    }
  } catch (error) {
    console.error("Error en upsertCatalogoItem:", error);
    return { ok: false, message: "Error interno del servidor" };
  }
}

/**
 * Eliminar un elemento del catálogo (soft delete)
 */
export async function deleteCatalogoItem(id: string): Promise<Result> {
  try {
    await assertCanWriteCosting();

    const existing = await prisma.configuracionCatalogo.findUnique({
      where: { id },
    });

    if (!existing) {
      return { ok: false, message: "Elemento no encontrado" };
    }

    // Soft delete - marcar como inactivo
    await prisma.configuracionCatalogo.update({
      where: { id },
      data: { activo: false },
    });

    revalidatePath("/admin/catalogos");
    return { ok: true, message: "Elemento eliminado correctamente" };
  } catch (error) {
    console.error("Error en deleteCatalogoItem:", error);
    return { ok: false, message: "Error interno del servidor" };
  }
}

/**
 * Reordenar elementos de un tipo de catálogo
 */
export async function reorderCatalogo(fd: FormData): Promise<Result> {
  try {
    await assertCanWriteCosting();

    const tipo = fd.get("tipo") as TipoCatalogo;
    const itemsJson = fd.get("items") as string;

    if (!tipo || !itemsJson) {
      return { ok: false, message: "Datos requeridos faltantes" };
    }

    const items: { id: string; orden: number }[] = JSON.parse(itemsJson);

    // Actualizar orden en transacción
    await prisma.$transaction(
      items.map(item =>
        prisma.configuracionCatalogo.update({
          where: { id: item.id },
          data: { orden: item.orden },
        })
      )
    );

    revalidatePath("/admin/catalogos");
    return { ok: true, message: "Orden actualizado correctamente" };
  } catch (error) {
    console.error("Error en reorderCatalogo:", error);
    return { ok: false, message: "Error interno del servidor" };
  }
}

/**
 * Restablecer un tipo de catálogo a sus valores por defecto
 */
export async function resetCatalogoTipo(tipo: TipoCatalogo): Promise<Result> {
  try {
    await assertCanWriteCosting();

    if (tipo === TipoCatalogo.TIPO_TRABAJO) {
      // Reset específico para tipos de trabajo con estructura jerárquica
      await resetTiposTrabajo();
      return { ok: true, message: "Tipos de trabajo restablecidos correctamente" };
    }

    // Para otros tipos, simplemente reactivamos todos los elementos
    await prisma.configuracionCatalogo.updateMany({
      where: { tipo },
      data: { activo: true },
    });

    revalidatePath("/admin/catalogos");
    return { ok: true, message: `Catálogo ${tipo} restablecido correctamente` };
  } catch (error) {
    console.error("Error en resetCatalogoTipo:", error);
    return { ok: false, message: "Error interno del servidor" };
  }
}

/**
 * Función específica para reset de tipos de trabajo con estructura jerárquica
 */
async function resetTiposTrabajo() {
  // Primero desactivamos todos los tipos de trabajo existentes
  await prisma.configuracionCatalogo.updateMany({
    where: { tipo: TipoCatalogo.TIPO_TRABAJO },
    data: { activo: false },
  });

  // Luego creamos/actualizamos los tipos principales y subcategorías
  const tiposTrabajo = [
    { codigo: "FABRICACION", nombre: "Fabricación", descripcion: "Trabajos de fabricación de piezas", orden: 1 },
    { codigo: "TRANSFORMACION", nombre: "Transformación", descripcion: "Trabajos de transformación de materiales", orden: 2 },
    { codigo: "RECTIFICACION", nombre: "Rectificación", descripcion: "Trabajos de rectificación y acabado", orden: 3 },
    { codigo: "SERVICIOS", nombre: "Servicios", descripcion: "Servicios especializados", orden: 4 },
    // Subcategorías de servicios
    { codigo: "SERVICIO_SOLDADURA_AUTOGENA", nombre: "Soldadura Autógena", descripcion: "Servicio de soldadura autógena", orden: 5, propiedades: { parent: "SERVICIOS", isSubcategory: true } },
    { codigo: "SERVICIO_SOLDADURA_TIG", nombre: "Soldadura TIG", descripcion: "Servicio de soldadura TIG", orden: 6, propiedades: { parent: "SERVICIOS", isSubcategory: true } },
    { codigo: "SERVICIO_PROTECTORES_METALICOS", nombre: "Protectores Metálicos", descripcion: "Servicio para protectores metálicos", orden: 7, propiedades: { parent: "SERVICIOS", isSubcategory: true } },
  ];

  for (const tipo of tiposTrabajo) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: TipoCatalogo.TIPO_TRABAJO, codigo: tipo.codigo } },
      create: {
        tipo: TipoCatalogo.TIPO_TRABAJO,
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        orden: tipo.orden,
        propiedades: tipo.propiedades,
        activo: true,
      },
      update: {
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        orden: tipo.orden,
        propiedades: tipo.propiedades,
        activo: true,
      },
    });
  }

  revalidatePath("/admin/catalogos");
}