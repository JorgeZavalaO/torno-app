"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertCanWritePermissions, assertCanReadPermissions } from "@/app/lib/guards";

type LoadResult = {
  role: { id: string; name: string; description: string | null } | null;
  permissions: { id: string; code: string; description: string }[];
  assignedIds: string[];
};
type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

export async function loadRolePermissions(roleId: string): Promise<LoadResult> {
  await assertCanReadPermissions();
  const [role, allPerms, existing] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    prisma.permission.findMany({ orderBy: { code: "asc" } }),
    prisma.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } }),
  ]);
  if (!role) return { role: null, permissions: [], assignedIds: [] };
  const assigned = new Set(existing.map(e => e.permissionId));
  return {
    role: { id: role.id, name: role.name, description: role.description ?? null },
    permissions: allPerms.map(p => ({ id: p.id, code: p.code, description: p.description ?? "" })),
    assignedIds: [...assigned],
  };
}

export async function grantPermissionToRole(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const roleId = String(formData.get("roleId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  if (!roleId || !permissionId) return { ok: false, message: "Datos inválidos" };

  try {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
    revalidatePath("/admin/role-permissions");
    return { ok: true, message: "Permiso asignado" };
  } catch {
    return { ok: false, message: "No se pudo asignar" };
  }
}

export async function revokePermissionFromRole(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const roleId = String(formData.get("roleId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  if (!roleId || !permissionId) return { ok: false, message: "Datos inválidos" };

  try {
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    revalidatePath("/admin/role-permissions");
    return { ok: true, message: "Permiso removido" };
  } catch {
    return { ok: false, message: "No se pudo remover" };
  }
}

export async function setRolePermissions(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const roleId = String(formData.get("roleId") ?? "");
  const ids = String(formData.get("permissionIds") ?? ""); // CSV
  if (!roleId) return { ok: false, message: "Datos inválidos" };

  const keep = ids ? ids.split(",").filter(Boolean) : [];

  try {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: keep.map(permissionId => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);
    revalidatePath("/admin/role-permissions");
    return { ok: true, message: "Permisos actualizados" };
  } catch {
    return { ok: false, message: "No se pudo actualizar el set" };
  }
}
