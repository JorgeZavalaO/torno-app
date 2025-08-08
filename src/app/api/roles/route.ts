export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanReadRoles, assertCanWriteRoles } from "@/app/lib/guards";

const CreateBody = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export async function GET() {
  await assertCanReadRoles();
  const items = await prisma.role.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await assertCanWriteRoles();
  const parse = CreateBody.safeParse(await req.json());
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parse.error.flatten() }, { status: 400 });
  }
  try {
    const created = await prisma.role.create({ data: parse.data });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Nombre de rol duplicado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error creando rol" }, { status: 500 });
  }
}
