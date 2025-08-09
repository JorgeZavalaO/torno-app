import "server-only";
import { prisma } from "@/app/lib/prisma";
import { stackServerApp } from "@/stack";

export type SessionUser = {
  stackUserId: string;
  email: string;
  displayName?: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = await stackServerApp.getUser();
  if (!user?.primaryEmail) return null;

  const sessionUser: SessionUser = {
    stackUserId: user.id,
    email: user.primaryEmail,
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

export const auth = getCurrentUser;
