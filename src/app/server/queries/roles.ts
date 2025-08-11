import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

export const getRolesCached = cache(
  async () => prisma.role.findMany({ orderBy: { createdAt: "desc" } }),
  ["roles:list"],
  { tags: [cacheTags.roles] }
);

// Para listados “alfabéticos” (role-permissions)
export const getRolesByNameCached = cache(
  async () =>
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
  ["roles:list:by-name"],
  { tags: [cacheTags.roles] }
);
