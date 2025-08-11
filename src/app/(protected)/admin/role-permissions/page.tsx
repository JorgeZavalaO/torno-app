import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import RolePermissionsClient from "./role-permissions.client";
import { getRolesByNameCached } from "@/app/server/queries/roles";
import { getRolePermissionsBundleCached } from "@/app/server/queries/role-permissions";

type SearchParams = { roleId?: string };

export default async function RolePermissionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "permissions.read"),
    userHasPermission(me.email, "permissions.write"),
  ]);
  if (!canRead) redirect("/");

  const roles = await getRolesByNameCached();
  const resolvedParams = await searchParams;
  const selectedRoleId = resolvedParams.roleId ?? roles[0]?.id;

  const initial = selectedRoleId
    ? await getRolePermissionsBundleCached(selectedRoleId)
    : { role: null, permissions: [], assignedIds: [] as string[] };

  return <RolePermissionsClient roles={roles} initial={initial} canWrite={canWrite} />;
}
