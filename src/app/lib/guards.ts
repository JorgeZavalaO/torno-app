import "server-only";
import { getCurrentUser } from "./auth";
import { userHasPermission } from "./rbac";

export async function assertAuthenticated() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");
  return user;
}

export async function assertCanReadRoles() {
  const u = await assertAuthenticated();
  const ok = await userHasPermission(u.email, "roles.read");
  if (!ok) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteRoles() {
  const u = await assertAuthenticated();
  const ok = await userHasPermission(u.email, "roles.write");
  if (!ok) throw new Error("No autorizado");
  return u;
}

export async function assertCanReadPermissions() {
  const u = await assertAuthenticated();
  const ok = await userHasPermission(u.email, "permissions.read");
  if (!ok) throw new Error("No autorizado");
  return u;
}
export async function assertCanWritePermissions() {
  const u = await assertAuthenticated();
  const ok = await userHasPermission(u.email, "permissions.write");
  if (!ok) throw new Error("No autorizado");
  return u;
}
