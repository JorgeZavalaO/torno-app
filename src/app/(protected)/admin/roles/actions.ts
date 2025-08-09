"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteRoles } from "@/app/lib/guards";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

const RoleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Nombre muy corto").max(80, "Máximo 80 caracteres").trim(),
  description: z.string().max(300, "Máximo 300 caracteres").optional(),
});

export async function createRole(formData: FormData): Promise<ActionResult> {
  await assertCanWriteRoles();
  const parsed = RoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  try {
    await prisma.role.create({ data: parsed.data });
    revalidatePath("/admin/roles");
    return { ok: true, message: "Rol creado" };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "Ya existe un rol con ese nombre" };
    }
    return { ok: false, message: "No se pudo crear el rol" };
  }
}

export async function updateRole(formData: FormData): Promise<ActionResult> {
  await assertCanWriteRoles();
  const parsed = RoleSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success || !parsed.data.id) return { ok: false, message: "Datos inválidos" };
  try {
    await prisma.role.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, description: parsed.data.description },
    });
    revalidatePath("/admin/roles");
    return { ok: true, message: "Rol actualizado" };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "Nombre de rol ya está en uso" };
    }
    return { ok: false, message: "No se pudo actualizar" };
  }
}

export async function deleteRole(formData: FormData): Promise<ActionResult> {
  await assertCanWriteRoles();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.role.delete({ where: { id } });
    revalidatePath("/admin/roles");
    return { ok: true, message: "Rol eliminado" };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2003") {
      return { ok: false, message: "No se puede eliminar: rol asignado a usuarios" };
    }
    return { ok: false, message: "No se pudo eliminar" };
  }
}
