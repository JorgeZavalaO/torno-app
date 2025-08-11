import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import UsersClient from "./users.client";
import { assignRoleToUser, removeUserRole, createUser, updateUser, deleteUser } from "./actions";
import { getUsersWithRolesCached } from "@/app/server/queries/users";
import { getRolesByNameCached } from "@/app/server/queries/roles";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const canRead = await userHasPermission(me.email, "roles.read");
  if (!canRead) redirect("/");

  const [users, roles, canAssign] = await Promise.all([
    getUsersWithRolesCached(),
    getRolesByNameCached(),
    userHasPermission(me.email, "users.assignRoles"),
  ]);

  const shapedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    roles: u.roles.map(r => ({ id: r.role.id, name: r.role.name })),
  }));

  return (
    <UsersClient
      initialUsers={shapedUsers}
      roles={roles}
      canAssign={canAssign}
      actions={{ assignRoleToUser, removeUserRole, createUser, updateUser, deleteUser }}
    />
  );
}
