import "server-only";
import { prisma } from "@/app/lib/prisma"; // usa tu helper de Prisma singleton
import { stackServerApp } from "@/stack";   // generado por el wizard

export type SessionUser = {
  stackUserId: string;
  email: string;
  displayName?: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  // Devuelve el usuario actual (o null). Puedes pasar { or: "redirect" } si quieres forzar login.
  const user = await stackServerApp.getUser();
  if (!user?.primaryEmail) return null;

  const sessionUser: SessionUser = {
    stackUserId: user.id,
    email: user.primaryEmail,       // OJO: en Stack/Neon es primaryEmail
    displayName: user.displayName ?? null,
  };

  await prisma.userProfile.upsert({
    where: { email: sessionUser.email },
    create: {
      email: sessionUser.email,
      stackUserId: sessionUser.stackUserId,
      displayName: sessionUser.displayName,
    },
    update: {
      stackUserId: sessionUser.stackUserId,
      displayName: sessionUser.displayName,
    },
  });

  return sessionUser;
}
