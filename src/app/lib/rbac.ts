import "server-only";
import { unstable_cache as ucache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

// Devuelve todos los códigos de permisos de un usuario (una sola consulta)
const _getUserPermissionCodes = async (email: string): Promise<string[]> => {
  // Si no existe el usuario, no hay permisos
  const user = await prisma.userProfile.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return [];

  // Trae códigos de permisos vía RolePermission -> Permission
  const rows = await prisma.rolePermission.findMany({
    where: {
      role: {
        users: {
          some: { userId: user.id }, // join por tabla pivote UserRole
        },
      },
    },
    select: { permission: { select: { code: true } } },
  });

  return rows.map(r => r.permission.code);
};

// ✅ cache cross-request con tags (se invalida cuando tus server actions llaman revalidateTag)
const getUserPermissionCodes = ucache(
  async (email: string) => _getUserPermissionCodes(email),
  // cache key
  [`rbac:permcodes`],
  { tags: [cacheTags.users, cacheTags.roles, cacheTags.permissions] }
);

export async function userHasPermission(userEmail: string, permissionCode: string) {
  const codes = new Set(await getUserPermissionCodes(userEmail));
  return codes.has(permissionCode);
}

export async function userHasRole(userEmail: string, roleName: string) {
  // Rol por nombre con count (más barato que includes)
  const count = await prisma.userRole.count({
    where: {
      user: { email: userEmail },
      role: { name: roleName },
    },
  });
  return count > 0;
}

// (opcional) útil para sidebars/pantallas con varios checks
export async function getUserPermissionSet(userEmail: string): Promise<Set<string>> {
  return new Set(await getUserPermissionCodes(userEmail));
}
