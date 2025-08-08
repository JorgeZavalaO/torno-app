"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteRoles } from "@/app/lib/guards";
import { revalidatePath } from "next/cache";

const RoleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nombre muy corto"),
  description: z.string().optional(),
});

export async function createRole(formData: FormData) {
  await assertCanWriteRoles();
  const parsed = RoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) throw new Error("Datos inválidos");

  await prisma.role.create({ data: parsed.data });
  revalidatePath("/admin/roles");
}

export async function updateRole(formData: FormData) {
  await assertCanWriteRoles();
  const parsed = RoleSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success || !parsed.data.id) throw new Error("Datos inválidos");

  await prisma.role.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, description: parsed.data.description },
  });
  revalidatePath("/admin/roles");
}

export async function deleteRole(formData: FormData) {
  await assertCanWriteRoles();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID requerido");

  await prisma.role.delete({ where: { id } });
  revalidatePath("/admin/roles");
}

const AssignSchema = z.object({
  email: z.string().email(),
  roleName: z.string().min(2),
});

export async function assignRoleToUser(formData: FormData) {
  await assertCanWriteRoles();
  const parsed = AssignSchema.safeParse({
    email: formData.get("email"),
    roleName: formData.get("roleName"),
  });
  if (!parsed.success) throw new Error("Datos inválidos");

  const [role, user] = await Promise.all([
    prisma.role.findUnique({ where: { name: parsed.data.roleName } }),
    prisma.userProfile.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, stackUserId: `pending-${Date.now()}` },
      update: {},
    }),
  ]);
  if (!role) throw new Error("Rol no existe");

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });

  revalidatePath("/admin/users");
}