import { getCurrentUser } from "@/app/lib/auth";

jest.mock("@/server/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/app/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: jest.fn() },
  },
}));

const { auth } = jest.requireMock("@/server/auth");
const { prisma } = jest.requireMock("@/app/lib/prisma");

describe("auth.getCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna null si no hay sesión", async () => {
    auth.mockResolvedValue({ user: null });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("si la sesión tiene id, retorna con displayName de profile si existe", async () => {
    auth.mockResolvedValue({ user: { email: "user@x.com", id: "U1", name: "Nombre Sesion" } });
    prisma.userProfile.findUnique.mockResolvedValue({ displayName: "Nombre Perfil" });
    const u = await getCurrentUser();
    expect(u).toEqual({ id: "U1", email: "user@x.com", displayName: "Nombre Perfil" });
  });

  it("si la sesión no tiene id, busca por email y usa id/displayName de BD", async () => {
    auth.mockResolvedValue({ user: { email: "user@x.com", name: "Sesion" } });
    prisma.userProfile.findUnique.mockResolvedValueOnce({ id: "U2", displayName: "Perfil" });
    const u = await getCurrentUser();
    expect(u).toEqual({ id: "U2", email: "user@x.com", displayName: "Perfil" });
  });
});
