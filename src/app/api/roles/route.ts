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
  const data = CreateBody.parse(await req.json());
  const created = await prisma.role.create({ data });
  return NextResponse.json(created, { status: 201 });
}
