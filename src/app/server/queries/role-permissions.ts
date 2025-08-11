import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

export const getRolePermissionsBundleCached = (roleId: string) =>
  cache(
    async () => {
      const [role, allPerms, existing] = await Promise.all([
        prisma.role.findUnique({ where: { id: roleId } }),
        prisma.permission.findMany({ orderBy: { code: "asc" } }),
        prisma.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } }),
      ]);
      if (!role) return { role: null, permissions: [], assignedIds: [] as string[] };
      return {
        role: { id: role.id, name: role.name, description: role.description ?? null },
        permissions: allPerms.map(p => ({ id: p.id, code: p.code, description: p.description ?? "" })),
        assignedIds: existing.map(e => e.permissionId),
      };
    },
    // clave única por roleId
    [`role-perms:bundle:${roleId}`],
    // tags: set del rol, + catálogo de permisos (al editar códigos/desc), + roles si renombraras
    { tags: [cacheTags.rolePerms(roleId), cacheTags.permissions, cacheTags.roles] }
  )();
