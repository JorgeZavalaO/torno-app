import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWritePermissions } from "@/app/lib/guards";

const UpdateBody = z.object({
  code: z.string().min(3).optional(),
  description: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await assertCanWritePermissions();
  const json = await req.json();
  const data = UpdateBody.parse(json);
  const updated = await prisma.permission.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await assertCanWritePermissions();
  await prisma.permission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
