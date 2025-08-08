export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanReadPermissions, assertCanWritePermissions } from "@/app/lib/guards";

const CreateBody = z.object({
  code: z.string().min(3),
  description: z.string().optional(),
});

export async function GET() {
  await assertCanReadPermissions();
  const items = await prisma.permission.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await assertCanWritePermissions();
  const parse = CreateBody.safeParse(await req.json());
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parse.error.flatten() }, { status: 400 });
  }
  try {
    const created = await prisma.permission.create({ data: parse.data });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Código de permiso duplicado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error creando permiso" }, { status: 500 });
  }
}
