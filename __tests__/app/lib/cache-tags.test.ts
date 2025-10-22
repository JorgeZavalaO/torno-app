import { cacheTags } from "@/app/lib/cache-tags";

describe("cache-tags", () => {
  it("tags estáticos", () => {
    expect(cacheTags.users).toBe("users:list");
    expect(cacheTags.roles).toBe("roles:list");
    expect(cacheTags.permissions).toBe("permissions:list");
  });

  it("tags dinámicos", () => {
    expect(cacheTags.rolePerms("123")).toBe("role-perms:123");
    expect(cacheTags.inventoryKardex("SKU-1")).toBe("inventory:kardex:SKU-1");
    expect(cacheTags.workorder("abc")).toBe("workorders:abc");
    expect(cacheTags.worklogs("xyz")).toBe("workorders:logs:xyz");
  });
});
