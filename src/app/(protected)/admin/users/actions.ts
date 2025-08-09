"use server";

import { prisma } from "@/app/lib/prisma";
import { assertCanAssignRoles } from "@/app/lib/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type MinimalUser = { id: string; email: string; displayName: string | null };
type ActionResult = { ok: true; message?: string; user?: MinimalUser } | { ok: false; message: string };

export async function assignRoleToUser(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleName = String(formData.get("roleName") ?? "").trim();
  if (!email || !roleName) return { ok: false, message: "Datos inválidos" };

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return { ok: false, message: "Rol no existe" };

  try {
    const user = await prisma.userProfile.upsert({
      where: { email },
      create: { email, stackUserId: `pending-${Date.now()}` },
      update: {},
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });

    revalidatePath("/admin/users");
    return { ok: true, message: "Rol asignado" };
  } catch {
    return { ok: false, message: "No se pudo asignar el rol" };
  }
}

export async function removeUserRole(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!userId || !roleId) return { ok: false, message: "Datos inválidos" };

  try {
    await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
    revalidatePath("/admin/users");
    return { ok: true, message: "Rol removido" };
  } catch {
    return { ok: false, message: "No se pudo remover el rol" };
  }
}

// ===== CRUD de usuarios =====

const CreateUserSchema = z.object({
  email: z.string().email("Email inválido").max(160).trim(),
  displayName: z.string().max(120, "Máximo 120 caracteres").optional(),
});

const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email("Email inválido").max(160).trim().optional(),
  displayName: z.string().max(120, "Máximo 120 caracteres").optional(),
});

export async function createUser(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();
  const parsed = CreateUserSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  try {
    const created = await prisma.userProfile.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        stackUserId: `pending-${Date.now()}`,
        displayName: parsed.data.displayName ?? null,
      },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Usuario creado", user: { id: created.id, email: created.email, displayName: created.displayName } };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "Ya existe un usuario con ese email" };
    }
    return { ok: false, message: "No se pudo crear el usuario" };
  }
}

export async function updateUser(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();
  const parsed = UpdateUserSchema.safeParse({
    id: formData.get("id"),
    email: formData.get("email") || undefined,
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { id, ...data } = parsed.data;
  try {
    const updated = await prisma.userProfile.update({
      where: { id },
      data: {
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Usuario actualizado", user: { id: updated.id, email: updated.email, displayName: updated.displayName ?? null } };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "Email ya está en uso" };
    }
    return { ok: false, message: "No se pudo actualizar el usuario" };
  }
}

export async function deleteUser(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "ID requerido" };

  try {
    await prisma.userProfile.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { ok: true, message: "Usuario eliminado" };
  } catch {
    return { ok: false, message: "No se pudo eliminar el usuario" };
  }
}
