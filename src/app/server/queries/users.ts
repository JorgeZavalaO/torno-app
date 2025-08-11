import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

export const getUsersWithRolesCached = cache(
  async () =>
    prisma.userProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: { roles: { include: { role: true } } },
    }),
  ["users:list-with-roles"],
  // Los usuarios y su lista dependen también de los roles (badges, conteos)
  { tags: [cacheTags.users, cacheTags.roles] }
);
