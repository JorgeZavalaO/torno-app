import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import PermissionsClient from "./permissions.client";
import { createPermission, updatePermission, deletePermission } from "./actions";
import { getPermissionsCached } from "@/app/server/queries/permissions";

export default async function PermissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(user.email, "permissions.read"),
    userHasPermission(user.email, "permissions.write"),
  ]);
  if (!canRead) redirect("/");

  const permissions = await getPermissionsCached();

  return (
    <PermissionsClient
      initialItems={permissions}
      canWrite={canWrite}
      actions={{ createPermission, updatePermission, deletePermission }}
    />
  );
}
