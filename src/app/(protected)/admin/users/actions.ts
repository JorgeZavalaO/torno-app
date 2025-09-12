"use server";

import { prisma } from "@/app/lib/prisma";
import { assertCanAssignRoles } from "@/app/lib/guards";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { cacheTags } from "@/app/lib/cache-tags";

type MinimalUser = { id: string; email: string; displayName: string | null };
type ActionResult =
  | { ok: true; message?: string; user?: MinimalUser }
  | { ok: false; message: string };

const emailSchema = z.string().email("Email inválido").max(160).transform(v => v.trim().toLowerCase());

export async function assignRoleToUser(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();

  const emailParse = emailSchema.safeParse(String(formData.get("email") ?? ""));
  const roleName = String(formData.get("roleName") ?? "").trim();
  if (!emailParse.success || !roleName) return { ok: false, message: "Datos inválidos" };
  const email = emailParse.data;

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return { ok: false, message: "Rol no existe" };

  // ⚠️ NO crear usuarios implícitamente aquí.
  const user = await prisma.userProfile.findUnique({ where: { email } });
  if (!user) return { ok: false, message: "No existe un usuario con ese email" };

  try {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });
  } catch (e: unknown) {
    // P2002: ya estaba asignado
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      // idempotente
    } else {
      return { ok: false, message: "No se pudo asignar el rol" };
    }
  }

  revalidateTag(cacheTags.users);
  revalidateTag(cacheTags.roles);
  revalidatePath("/admin/users", "page");

  return { ok: true, message: "Rol asignado", user: { id: user.id, email: user.email, displayName: user.displayName } };
}

// ===== CRUD de usuarios =====

const CreateUserSchema = z.object({
  email: emailSchema,
  displayName: z.string().max(120, "Máximo 120 caracteres").optional(),
  // contraseña opcional para creación por admin
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
});

const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema.optional(),
  displayName: z.string().max(120, "Máximo 120 caracteres").optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
});

export async function createUser(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();
  const parsed = CreateUserSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName") || undefined,
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  try {
    const data: {
      email: string;
      stackUserId: string;
      displayName: string | null;
      passwordHash?: string;
    } = {
      email: parsed.data.email,
      // ⚠️ Evita IDs "pending-*"; deja integraciones externas sincronizar el ID real
      stackUserId: "",
      displayName: parsed.data.displayName ?? null,
    };

    if (parsed.data.password) {
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      data.passwordHash = passwordHash;
    }

    const created = await prisma.userProfile.create({ data });

    revalidateTag(cacheTags.users);
    revalidatePath("/admin/users", "page");

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
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { id, email, displayName, password } = parsed.data;

  try {
    const updateData: {
      email?: string;
      displayName?: string;
      passwordHash?: string;
    } = {};

    if (email) updateData.email = email;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      updateData.passwordHash = passwordHash;
    }

    const updated = await prisma.userProfile.update({
      where: { id },
      data: updateData,
    });

    revalidateTag(cacheTags.users);
    revalidatePath("/admin/users", "page");

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
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.userProfile.delete({ where: { id } }),
    ]);

    revalidateTag(cacheTags.users);
    revalidatePath("/admin/users", "page");

    return { ok: true, message: "Usuario eliminado" };
  } catch {
    return { ok: false, message: "No se pudo eliminar el usuario" };
  }
}

export async function removeUserRole(formData: FormData): Promise<ActionResult> {
  await assertCanAssignRoles();
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!userId || !roleId) return { ok: false, message: "Datos inválidos" };

  try {
    await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });

    revalidateTag(cacheTags.users);
    revalidateTag(cacheTags.roles);
    revalidatePath("/admin/users", "page");

    return { ok: true, message: "Rol removido" };
  } catch {
    return { ok: false, message: "No se pudo remover el rol" };
  }
}
