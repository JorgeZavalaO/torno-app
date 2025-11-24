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

  const [users, roles, canAssign, canWriteRoles, canDeleteUsers] = await Promise.all([
    getUsersWithRolesCached(),
    getRolesByNameCached(),
    userHasPermission(me.email, "users.assignRoles"), // para crear / editar / asignar roles
    userHasPermission(me.email, "roles.write"),       // alternativamente podría controlar edición
    userHasPermission(me.email, "users.assignRoles"), // reutilizamos para delete (no existe permiso específico)
  ]);

  const shapedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    stackUserId: u.stackUserId,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    roles: u.roles.map(r => ({ id: r.role.id, name: r.role.name })),
  }));

  return (
    <UsersClient
      initialUsers={shapedUsers}
      roles={roles}
      canAssign={canAssign}
      canUpdate={canAssign || canWriteRoles}
      canDelete={canDeleteUsers}
      actions={{ assignRoleToUser, removeUserRole, createUser, updateUser, deleteUser }}
    />
  );
}
