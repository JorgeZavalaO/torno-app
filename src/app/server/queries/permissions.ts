import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

export const getPermissionsCached = cache(
  async () => prisma.permission.findMany({ orderBy: { createdAt: "desc" } }),
  ["permissions:list"],
  { tags: [cacheTags.permissions] }
);
