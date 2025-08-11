"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { assertCanWritePermissions, assertCanReadPermissions } from "@/app/lib/guards";
import { cacheTags } from "@/app/lib/cache-tags";

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
    await prisma.rolePermission.create({ data: { roleId, permissionId } });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code !== "P2002") {
      return { ok: false, message: "No se pudo asignar" }; 
    }
  }

  revalidateTag(cacheTags.rolePerms(roleId));
  revalidatePath("/admin/role-permissions", "page");
  return { ok: true, message: "Permiso asignado" };
}

export async function revokePermissionFromRole(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const roleId = String(formData.get("roleId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  if (!roleId || !permissionId) return { ok: false, message: "Datos inválidos" };

  try {
    await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
  } catch {
    // si no existe, idempotente
  }

  revalidateTag(cacheTags.rolePerms(roleId));
  revalidatePath("/admin/role-permissions", "page");
  return { ok: true, message: "Permiso removido" };
}

export async function setRolePermissions(formData: FormData): Promise<ActionResult> {
  await assertCanWritePermissions();
  const roleId = String(formData.get("roleId") ?? "");
  const ids = String(formData.get("permissionIds") ?? ""); // CSV
  if (!roleId) return { ok: false, message: "Datos inválidos" };

  const keep = ids ? ids.split(",").map(s => s.trim()).filter(Boolean) : [];

  try {
    const existing = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    const existingSet = new Set(existing.map(e => e.permissionId));
    const keepSet = new Set(keep);

    const toAdd = keep.filter(id => !existingSet.has(id));
    const toRemove = [...existingSet].filter(id => !keepSet.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return { ok: true, message: "Sin cambios" };
    }

    await prisma.$transaction([
      ...(toRemove.length
        ? [prisma.rolePermission.deleteMany({ where: { roleId, permissionId: { in: toRemove } } })]
        : []),
      ...(toAdd.length
        ? [prisma.rolePermission.createMany({ data: toAdd.map(permissionId => ({ roleId, permissionId })), skipDuplicates: true })]
        : []),
    ]);

    revalidateTag(cacheTags.rolePerms(roleId));
    revalidatePath("/admin/role-permissions", "page");

    return { ok: true, message: "Permisos actualizados" };
  } catch {
    return { ok: false, message: "No se pudo actualizar el set" };
  }
}
