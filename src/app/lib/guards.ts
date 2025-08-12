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

export async function assertCanReadClients() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "clients.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteClients() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "clients.write")) throw new Error("No autorizado");
  return u;
}
export async function assertCanReadCosting() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "settings.costing.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteCosting() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "settings.costing.write")) throw new Error("No autorizado");
  return u;
}
export async function assertCanReadQuotes() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "quotes.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteQuotes() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "quotes.write")) throw new Error("No autorizado");
  return u;
}
