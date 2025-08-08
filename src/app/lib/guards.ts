import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";

export async function assertAuthenticated() {
  const u = await getCurrentUser();
  if (!u) throw new Error("No autenticado");
  return u;
}

export async function assertCanReadRoles() { const u = await assertAuthenticated(); if (!await userHasPermission(u.email, "roles.read")) throw new Error("No autorizado"); return u; }
export async function assertCanWriteRoles() { const u = await assertAuthenticated(); if (!await userHasPermission(u.email, "roles.write")) throw new Error("No autorizado"); return u; }

export async function assertCanReadPermissions() { const u = await assertAuthenticated(); if (!await userHasPermission(u.email, "permissions.read")) throw new Error("No autorizado"); return u; }
export async function assertCanWritePermissions() { const u = await assertAuthenticated(); if (!await userHasPermission(u.email, "permissions.write")) throw new Error("No autorizado"); return u; }

export async function assertCanAssignRoles() { const u = await assertAuthenticated(); if (!await userHasPermission(u.email, "users.assignRoles")) throw new Error("No autorizado"); return u; }
