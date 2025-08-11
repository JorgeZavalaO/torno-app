"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteRoles } from "@/app/lib/guards";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";

type ActionResult =
| { ok: true; message?: string; item?: { id: string; name: string; description: string | null } }
| { ok: false; message: string };

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
    const created = await prisma.role.create({ data: parsed.data });

    revalidateTag(cacheTags.roles);
    revalidatePath("/admin/roles", "page");

    return {
       ok: true,
       message: "Rol creado",
       item: { id: created.id, name: created.name, description: created.description ?? null },
      };
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
    const updated = await prisma.role.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, description: parsed.data.description },
    });

    revalidateTag(cacheTags.roles);
    revalidatePath("/admin/roles", "page");

    return {
       ok: true,
       message: "Rol actualizado",
       item: { id: updated.id, name: updated.name, description: updated.description ?? null },};
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

    revalidateTag(cacheTags.roles);
    revalidatePath("/admin/roles", "page");

    return { ok: true, message: "Rol eliminado" };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2003") {
      return { ok: false, message: "No se puede eliminar: rol asignado a usuarios" };
    }
    return { ok: false, message: "No se pudo eliminar" };
  }
}
