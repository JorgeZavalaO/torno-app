import "server-only";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function userHasRole(userEmail: string, roleName: string) {
  const user = await prisma.userProfile.findUnique({
    where: { email: userEmail },
    include: { roles: { include: { role: true } } },
  });
  return !!user?.roles.some(r => r.role.name === roleName);
}

export async function userHasPermission(userEmail: string, permissionCode: string) {
  const user = await prisma.userProfile.findUnique({
    where: { email: userEmail },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });
  const perms = new Set(
    user?.roles.flatMap(rp => rp.role.permissions.map(p => p.permission.code)) ?? []
  );
  return perms.has(permissionCode);
}
