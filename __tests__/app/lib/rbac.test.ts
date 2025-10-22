import { getUserPermissionCodes, userHasPermission, userHasRole } from "@/app/lib/rbac";

jest.mock("@/app/lib/prisma", () => {
  return {
    prisma: {
      userProfile: { findUnique: jest.fn() },
      rolePermission: { findMany: jest.fn() },
      userRole: { count: jest.fn() },
    },
  };
});

const { prisma } = jest.requireMock("@/app/lib/prisma");

describe("rbac", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna códigos de permisos del usuario", async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ id: "u1" });
    prisma.rolePermission.findMany.mockResolvedValue([
      { permission: { code: "a.read" } },
      { permission: { code: "b.write" } },
    ]);

    const codes = await getUserPermissionCodes("User@Mail.Com");
    expect(codes).toEqual(["a.read", "b.write"]);
  });

  it("usuario no existe => lista vacía", async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    const codes = await getUserPermissionCodes("no@existe");
    expect(codes).toEqual([]);
  });

  it("userHasPermission true/false", async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ id: "u1" });
    prisma.rolePermission.findMany.mockResolvedValue([{ permission: { code: "x.perm" } }]);

    await expect(userHasPermission("a@b.c", "x.perm")).resolves.toBe(true);
    await expect(userHasPermission("a@b.c", "y.perm")).resolves.toBe(false);
  });

  it("userHasRole usa count > 0", async () => {
    prisma.userRole.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(userHasRole("a@b.c", "ADMIN")).resolves.toBe(true);
    await expect(userHasRole("a@b.c", "USER")).resolves.toBe(false);
  });
});
