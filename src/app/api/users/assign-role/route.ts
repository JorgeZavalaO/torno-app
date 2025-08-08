import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { assertCanWriteRoles } from "@/app/lib/guards";


const Body = z.object({
  userEmail: z.string().email(),
  roleName: z.string().min(2),
});

export async function POST(req: Request) {
  await assertCanWriteRoles();
  const { userEmail, roleName } = Body.parse(await req.json());

  const user = await prisma.userProfile.findUnique({ where: { email: userEmail } });
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!user || !role) return NextResponse.json({ message: "User o Role no existe" }, { status: 404 });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
