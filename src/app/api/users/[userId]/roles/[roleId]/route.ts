export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertCanAssignRoles } from "@/app/lib/guards";

type Params = { userId: string; roleId: string };

export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  await assertCanAssignRoles();
  const { userId, roleId } = await ctx.params;
  try {
    await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error eliminando asignación" }, { status: 500 });
  }
}
