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
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(1).max(200),
  descripcion: z.string().max(500).optional(),
  orden: z.number().int().min(0).max(9999),
  activo: z.boolean().optional(),
  color: z.string().max(20).optional(),
  icono: z.string().max(50).optional(),
});

/**
 * Crear o actualizar un elemento del catálogo
 */
export async function upsertCatalogoItem(fd: FormData): Promise<Result> {
  try {
    await assertCanWriteCosting();

    const parsed = CatalogoItemSchema.safeParse({
      id: fd.get("id") || undefined,
      tipo: fd.get("tipo"),
      codigo: fd.get("codigo"),
      nombre: fd.get("nombre"),
      descripcion: fd.get("descripcion") || undefined,
      orden: Number(fd.get("orden") || 0),
      activo: fd.get("activo") === "true",
      color: fd.get("color") || undefined,
      icono: fd.get("icono") || undefined,
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0].message };
    }

    const data = parsed.data;

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

      const created = await prisma.configuracionCatalogo.create({
        data: {
          tipo: data.tipo,
          codigo: data.codigo,
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          orden: data.orden,
          activo: data.activo ?? true,
          color: data.color || null,
          icono: data.icono || null,
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

    // Aquí podrías implementar la lógica para restablecer a valores por defecto
    // Por ahora, simplemente reactivamos todos los elementos de ese tipo
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