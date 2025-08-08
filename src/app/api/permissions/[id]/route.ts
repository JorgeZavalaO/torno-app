export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWritePermissions } from "@/app/lib/guards";

const UpdateBody = z.object({
  code: z.string().min(3).optional(),
  description: z.string().optional(),
});

type Params = { id: string };

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  await assertCanWritePermissions();
  const { id } = await ctx.params;

  const parse = UpdateBody.safeParse(await req.json());
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parse.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await prisma.permission.update({ where: { id }, data: parse.data });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") {
        return NextResponse.json({ error: "Código duplicado" }, { status: 409 });
      }
      if (code === "P2025") {
        return NextResponse.json({ error: "Permiso no encontrado" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Error actualizando permiso" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  await assertCanWritePermissions();
  const { id } = await ctx.params;
  try {
    await prisma.permission.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "Permiso no encontrado" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Error eliminando permiso" }, { status: 500 });
  }
}
