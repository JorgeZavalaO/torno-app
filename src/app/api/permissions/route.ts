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
  const json = await req.json();
  const data = CreateBody.parse(json);
  const created = await prisma.permission.create({ data });
  return NextResponse.json(created, { status: 201 });
}
