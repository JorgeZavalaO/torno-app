export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteRoles } from "@/app/lib/guards";

const UpdateBody = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

type Params = { id: string };

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  await assertCanWriteRoles();
  const { id } = await ctx.params;

  const parse = UpdateBody.safeParse(await req.json());
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parse.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await prisma.role.update({ where: { id }, data: parse.data });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const error = e as { code?: string };
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Nombre de rol duplicado" }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Error actualizando rol" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  await assertCanWriteRoles();
  const { id } = await ctx.params;
  try {
    await prisma.role.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const error = e as { code?: string };
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Error eliminando rol" }, { status: 500 });
  }
}
