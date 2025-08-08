"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWritePermissions } from "@/app/lib/guards";
import { revalidatePath } from "next/cache";

const PermSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3),
  description: z.string().optional(),
});

export async function createPermission(formData: FormData) {
  await assertCanWritePermissions();
  const parsed = PermSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) throw new Error("Datos inválidos");
  await prisma.permission.create({ data: parsed.data });
  revalidatePath("/admin/permissions");
}

export async function updatePermission(formData: FormData) {
  await assertCanWritePermissions();
  const parsed = PermSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success || !parsed.data.id) throw new Error("Datos inválidos");
  const { id, ...data } = parsed.data;
  await prisma.permission.update({ where: { id }, data });
  revalidatePath("/admin/permissions");
}

export async function deletePermission(formData: FormData) {
  await assertCanWritePermissions();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID requerido");
  await prisma.permission.delete({ where: { id } });
  revalidatePath("/admin/permissions");
}
