export const cacheTags = {
  users: "users:list",
  roles: "roles:list",
  permissions: "permissions:list",
  rolePerms: (roleId: string) => `role-perms:${roleId}`,
};
