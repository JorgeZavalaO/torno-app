import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteRoles } from "@/app/lib/guards";

const UpdateBody = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await assertCanWriteRoles();
  const data = UpdateBody.parse(await req.json());
  const updated = await prisma.role.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await assertCanWriteRoles();
  await prisma.role.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
