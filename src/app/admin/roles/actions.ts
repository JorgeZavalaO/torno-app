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
