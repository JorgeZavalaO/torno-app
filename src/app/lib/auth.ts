import "server-only";
import { cache } from "react";
import { stackServerApp } from "@/stack";
import { prisma } from "@/app/lib/prisma";

export type SessionUser = {
  stackUserId: string;
  email: string;
  displayName?: string | null;
};

// ✅ Solo lectura y memoizado por request
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const user = await stackServerApp.getUser();
  if (!user?.primaryEmail) return null;

  return {
    stackUserId: user.id,
    email: user.primaryEmail.toLowerCase(),
    displayName: user.displayName ?? null,
  };
});

// 🔹 (Opcional) Llamar SOLO después de sign-in, no en cada render
export async function syncUserProfileOnce(): Promise<void> {
  const u = await getCurrentUser();
  if (!u) return;

  await prisma.userProfile.upsert({
    where: { email: u.email },
    create: { email: u.email, stackUserId: u.stackUserId, displayName: u.displayName ?? null },
    update: { stackUserId: u.stackUserId, displayName: u.displayName ?? null },
  });
}
