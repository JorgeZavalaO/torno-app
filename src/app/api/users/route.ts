export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertCanReadRoles } from "@/app/lib/guards";

export async function GET() {
  await assertCanReadRoles(); // o assertCanReadUsers si lo separas
  const users = await prisma.userProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: { roles: { include: { role: true } } },
  });
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      roles: u.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
    }))
  );
}
