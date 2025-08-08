"use server";

import { prisma } from "@/app/lib/prisma";
import { assertCanAssignRoles, assertCanReadRoles } from "@/app/lib/guards";
import { revalidatePath } from "next/cache";

export async function assignRoleToUser(formData: FormData) {
  await assertCanAssignRoles();
  const email = String(formData.get("email") ?? "");
  const roleName = String(formData.get("roleName") ?? "");
  if (!email || !roleName) throw new Error("Datos inválidos");

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error("Rol no existe");

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
}

export async function removeUserRole(formData: FormData) {
  await assertCanAssignRoles();
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!userId || !roleId) throw new Error("Datos inválidos");

  await prisma.userRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });

  revalidatePath("/admin/users");
}

