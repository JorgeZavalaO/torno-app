import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import RolesClient from "./roles.client";
import { createRole, updateRole, deleteRole } from "./actions";
import { getRolesCached } from "@/app/server/queries/roles";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(user.email, "roles.read"),
    userHasPermission(user.email, "roles.write"),
  ]);
  if (!canRead) redirect("/");

  const roles = await getRolesCached();

  return (
    <RolesClient
      initialItems={roles}
      canWrite={canWrite}
      actions={{ createRole, updateRole, deleteRole }}
    />
  );
}
