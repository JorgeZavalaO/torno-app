export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanAssignRoles } from "@/app/lib/guards";

const Body = z.object({
  email: z.string().email(),
  roleName: z.string().min(2),
});

export async function POST(req: Request) {
  await assertCanAssignRoles();

  const parse = Body.safeParse(await req.json());
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parse.error.flatten() }, { status: 400 });
  }

  const { email, roleName } = parse.data;

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return NextResponse.json({ error: "Rol no existe" }, { status: 404 });

  try {
    const user = await prisma.userProfile.upsert({
      where: { email },
      create: { email, stackUserId: `pending-${Date.now()}` },
      update: {},
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error asignando rol" }, { status: 500 });
  }
}
