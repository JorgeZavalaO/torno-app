"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWritePermissions } from "@/app/lib/guards";
import { revalidatePath } from "next/cache";

// Respuesta estándar para acciones
type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

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
    await prisma.permission.create({ data: parsed.data });
    revalidatePath("/admin/permissions");
    return { ok: true, message: "Permiso creado" };
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
    await prisma.permission.update({ where: { id }, data });
    revalidatePath("/admin/permissions");
    return { ok: true, message: "Permiso actualizado" };
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
    revalidatePath("/admin/permissions");
    return { ok: true, message: "Permiso eliminado" };
  } catch (e: unknown) {
    // P2003: FK constraint (p.ej., asignado a roles)
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2003")
      return { ok: false, message: "No se puede eliminar: está asignado a uno o más roles" };
    return { ok: false, message: "No se pudo eliminar" };
  }
}
