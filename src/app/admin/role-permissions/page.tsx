import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { prisma } from "@/app/lib/prisma";
import RolePermissionsClient from "./role-permissions.client";
import { loadRolePermissions } from "./actions";

type SearchParams = { roleId?: string };

export const dynamic = "force-dynamic";

export default async function RolePermissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>; // Next 15: Promise para tipado estricto
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  // permisos de lectura y escritura
  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "permissions.read"),
    userHasPermission(me.email, "permissions.write"),
  ]);
  if (!canRead) redirect("/");

  const sp = await searchParams;
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  // Si no hay roleId selecciona el primero (si existe)
  const selectedRoleId = sp.roleId ?? roles[0]?.id;

  const initial =
    selectedRoleId
      ? await loadRolePermissions(selectedRoleId) // server action reutilizada sin fetch
      : { role: null, permissions: [], assignedIds: [] as string[] };

  return (
    <RolePermissionsClient
      roles={roles}
      initial={initial}
      canWrite={canWrite}
    />
  );
}
