// Mockear ANTES de importar el módulo bajo prueba para evitar cargar dependencias ESM
jest.mock("@/app/lib/auth", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/app/lib/rbac", () => ({ userHasPermission: jest.fn() }));

import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
const getCurrentUserMock = getCurrentUser as unknown as jest.Mock;
const userHasPermissionMock = userHasPermission as unknown as jest.Mock;
import {
  assertAuthenticated,
  assertCanReadRoles,
  assertCanWriteRoles,
  assertCanReadPermissions,
  assertCanWritePermissions,
  assertCanReadClients,
  assertCanWriteClients,
} from "@/app/lib/guards";

describe("guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("assertAuthenticated lanza si no hay usuario", async () => {
  getCurrentUserMock.mockResolvedValue(null);
    await expect(assertAuthenticated()).rejects.toThrow("No autenticado");
  });

  it("assertAuthenticated retorna usuario si hay sesión", async () => {
  const u = { id: "1", email: "a@b.c" };
  getCurrentUserMock.mockResolvedValue(u);
    await expect(assertAuthenticated()).resolves.toEqual(u);
  });

  it("assertCanReadRoles autoriza con permiso", async () => {
  const u = { id: "1", email: "a@b.c" };
  getCurrentUserMock.mockResolvedValue(u);
  userHasPermissionMock.mockResolvedValue(true);
    await expect(assertCanReadRoles()).resolves.toEqual(u);
  });

  it("assertCanWriteRoles falla sin permiso", async () => {
  const u = { id: "1", email: "a@b.c" };
  getCurrentUserMock.mockResolvedValue(u);
  userHasPermissionMock.mockResolvedValue(false);
    await expect(assertCanWriteRoles()).rejects.toThrow("No autorizado");
  });

  it("otros guards funcionan similar (ejemplo: clients)", async () => {
  const u = { id: "1", email: "a@b.c" };
  getCurrentUserMock.mockResolvedValue(u);
  userHasPermissionMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(assertCanReadPermissions()).resolves.toEqual(u);
    await expect(assertCanWritePermissions()).rejects.toThrow("No autorizado");

  userHasPermissionMock.mockReset().mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await expect(assertCanReadClients()).resolves.toEqual(u);
    await expect(assertCanWriteClients()).resolves.toEqual(u);
  });
});
