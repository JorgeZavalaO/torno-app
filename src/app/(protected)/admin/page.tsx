import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersClient from "./users/users.client";
import RolesClient from "./roles/roles.client";
import PermissionsClient from "./permissions/permissions.client";
import RolePermissionsClient from "./role-permissions/role-permissions.client";
import { assignRoleToUser, removeUserRole, createUser, updateUser, deleteUser } from "./users/actions";
import { createRole, updateRole, deleteRole } from "./roles/actions";
import { createPermission, updatePermission, deletePermission } from "./permissions/actions";
import { getUsersWithRolesCached } from "@/app/server/queries/users";
import { getRolesCached, getRolesByNameCached } from "@/app/server/queries/roles";
import { getPermissionsCached } from "@/app/server/queries/permissions";
import { getRolePermissionsBundleCached } from "@/app/server/queries/role-permissions";

type SP = { roleId?: string };
export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<SP> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  // Permisos base para ver el admin
  const canReadRoles = await userHasPermission(me.email, "roles.read");
  const canReadPerms = await userHasPermission(me.email, "permissions.read");
  const canAssignUsers = await userHasPermission(me.email, "users.assignRoles");
  if (!canReadRoles && !canReadPerms && !canAssignUsers) redirect("/");

  const [users, roles, rolesByName, permissions, canWriteRoles, canWritePerms, canUpdateUsers, canDeleteUsers] = await Promise.all([
    getUsersWithRolesCached(),
    getRolesCached(),
    getRolesByNameCached(),
    getPermissionsCached(),
    userHasPermission(me.email, "roles.write"),
    userHasPermission(me.email, "permissions.write"),
    userHasPermission(me.email, "users.write"),
    userHasPermission(me.email, "users.delete"),
  ]);

  const shapedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    roles: u.roles.map(r => ({ id: r.role.id, name: r.role.name })),
  }));

  const resolvedParams: SP = await (searchParams ?? Promise.resolve({} as SP));
  const selectedRoleId = (resolvedParams && 'roleId' in resolvedParams ? resolvedParams.roleId : undefined) ?? rolesByName[0]?.id;
  const initialRolePermBundle = selectedRoleId
    ? await getRolePermissionsBundleCached(selectedRoleId)
    : { role: null, permissions: [], assignedIds: [] as string[] };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
        <p className="text-muted-foreground">Usuarios, Roles, Permisos y Asignaciones</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
          <TabsTrigger value="role-permissions">Permisos por Rol</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersClient
            initialUsers={shapedUsers}
            roles={rolesByName}
            canAssign={canAssignUsers}
            canUpdate={canUpdateUsers}
            canDelete={canDeleteUsers}
            actions={{ assignRoleToUser, removeUserRole, createUser, updateUser, deleteUser }}
          />
        </TabsContent>

        <TabsContent value="roles">
          <RolesClient
            initialItems={roles}
            canWrite={canWriteRoles}
            actions={{ createRole, updateRole, deleteRole }}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsClient
            initialItems={permissions}
            canWrite={canWritePerms}
            actions={{ createPermission, updatePermission, deletePermission }}
          />
        </TabsContent>

        <TabsContent value="role-permissions">
          <RolePermissionsClient roles={rolesByName} initial={initialRolePermBundle} canWrite={canWritePerms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
