import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { prisma } from "@/app/lib/prisma";
import UsersClient from "./users.client";
import { assignRoleToUser, removeUserRole, createUser, updateUser, deleteUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const canRead = await userHasPermission(me.email, "roles.read");
  if (!canRead) redirect("/");

  const [users, roles, canAssign] = await Promise.all([
    prisma.userProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
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
