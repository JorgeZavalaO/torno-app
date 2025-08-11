"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWritePermissions } from "@/app/lib/guards";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";

// Respuesta estándar para acciones
type ActionResult =
  | { ok: true; message?: string; item?: { id: string; code: string; description: string | null } }
  | { ok: false; message: string };

const PermSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(3, "Código muy corto").max(100, "Máximo 100 caracteres").trim(),
  description: z.string().max(300, "Máximo 300 caracteres").optional(),
});

export async function createPermission(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const parsed = PermSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  try {
    const created = await prisma.permission.create({ data: parsed.data });
        // 🔧 invalida catálogo de permisos (afecta bundles por rol)
    revalidateTag(cacheTags.permissions);
    revalidatePath("/admin/permissions", "page");
    return { 
      ok: true,
      message: "Permiso creado",
      item: { id: created.id, code: created.code, description: created.description ?? null },
    };
  } catch (e: unknown) {
    // P2002: unique constraint
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002")
      return { ok: false, message: "Ya existe un permiso con ese código" };
    return { ok: false, message: "No se pudo crear el permiso" };
  }
}

export async function updatePermission(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const parsed = PermSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success || !parsed.data.id) return { ok: false, message: "Datos inválidos" };
  const { id, ...data } = parsed.data;
  try {
    const updated = await prisma.permission.update({ where: { id }, data });
    // 🔧 invalida catálogo
    revalidateTag(cacheTags.permissions);
    revalidatePath("/admin/permissions", "page");
    return { ok: true, message: "Permiso actualizado", item: { id: updated.id, code: updated.code, description: updated.description ?? null } };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002")
      return { ok: false, message: "Código ya está en uso" };
    return { ok: false, message: "No se pudo actualizar" };
  }
}

export async function deletePermission(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.permission.delete({ where: { id } });
    // 🔧 invalida catálogo
    revalidateTag(cacheTags.permissions);
    revalidatePath("/admin/permissions", "page");
    return { ok: true, message: "Permiso eliminado" };
  }  catch (e: unknown) {
    // P2003: FK constraint (p.ej., asignado a roles)
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2003")
      return { ok: false, message: "No se puede eliminar: está asignado a uno o más roles" };
    return { ok: false, message: "No se pudo eliminar" };
  }
}
