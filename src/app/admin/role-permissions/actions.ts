"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertCanWritePermissions, assertCanReadPermissions } from "@/app/lib/guards";

// Para cargar datos del selector desde el server (opcionalmente usable desde client con form action)
export async function loadRolePermissions(roleId: string) {
  await assertCanReadPermissions();
  const [role, allPerms, existing] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    prisma.permission.findMany({ orderBy: { code: "asc" } }),
    prisma.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } }),
  ]);
  if (!role) throw new Error("Rol no encontrado");
  const assigned = new Set(existing.map(e => e.permissionId));
  return {
    role: { id: role.id, name: role.name, description: role.description ?? null },
    permissions: allPerms.map(p => ({ id: p.id, code: p.code, description: p.description ?? "" })),
    assignedIds: [...assigned],
  };
}

// Marcar (grant) un permiso a un rol
export async function grantPermissionToRole(formData: FormData) {
  await assertCanWritePermissions();

  const roleId = String(formData.get("roleId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  if (!roleId || !permissionId) throw new Error("Datos inválidos");

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    create: { roleId, permissionId },
    update: {},
  });

  revalidatePath("/admin/role-permissions");
}

// Quitar (revoke) un permiso de un rol
export async function revokePermissionFromRole(formData: FormData) {
  await assertCanWritePermissions();

  const roleId = String(formData.get("roleId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  if (!roleId || !permissionId) throw new Error("Datos inválidos");

  await prisma.rolePermission.delete({
    where: { roleId_permissionId: { roleId, permissionId } },
  });

  revalidatePath("/admin/role-permissions");
}

// Opcional: actualizar en bloque (sobre-escribe el set de permisos del rol)
export async function setRolePermissions(formData: FormData) {
  await assertCanWritePermissions();

  const roleId = String(formData.get("roleId") ?? "");
  const ids = String(formData.get("permissionIds") ?? ""); // CSV de IDs
  if (!roleId) throw new Error("Datos inválidos");

  const keep = ids ? ids.split(",").filter(Boolean) : [];

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: keep.map(permissionId => ({ roleId, permissionId })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin/role-permissions");
}
