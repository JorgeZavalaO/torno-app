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
export async function assertCanReadInventory() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "inventory.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteInventory() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "inventory.write")) throw new Error("No autorizado");
  return u;
}

export async function assertCanReadPurchases() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "purchases.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWritePurchases() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "purchases.write")) throw new Error("No autorizado");
  return u;
}

export async function assertCanReadWorkorders() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "workorders.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteWorkorders() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "workorders.write")) throw new Error("No autorizado");
  return u;
}

// Máquinas (inventario de activos / eventos / mantenimiento)
export async function assertCanReadMachines() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "machines.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteMachines() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "machines.write")) throw new Error("No autorizado");
  return u;
}

// Producción (tablero control y registro de partes/piezas)
export async function assertCanReadProduction() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "production.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteProduction() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "production.write")) throw new Error("No autorizado");
  return u;
}

// Perfil de usuario (lectura/escritura propia)
export async function assertCanReadProfile() {
  const u = await assertAuthenticated();
  // Asumimos que todos los usuarios autenticados pueden leer su perfil
  return u;
}
export async function assertCanWriteProfile() {
  const u = await assertAuthenticated();
  // Asumimos que todos los usuarios autenticados pueden editar su perfil
  return u;
}

// Configuración de catálogos (configuraciones del sistema)
export async function assertCanReadCatalogos() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "settings.catalogos.read")) throw new Error("No autorizado");
  return u;
}
export async function assertCanWriteCatalogos() {
  const u = await assertAuthenticated();
  if (!await userHasPermission(u.email, "settings.catalogos.write")) throw new Error("No autorizado");
  return u;
}