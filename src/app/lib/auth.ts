import "server-only";
import { auth } from "@/server/auth";
import { prisma } from "@/app/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

export type SessionUser = {
  id: string;
  email: string;
  displayName?: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  noStore();
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const id = (session?.user as { id?: string } | undefined)?.id;

  // Si la sesión aún no trae id (ej: antes de callbacks agregados), lo buscamos por email
  if (!id) {
    const profile = await prisma.userProfile.findUnique({ where: { email }, select: { id: true, displayName: true } });
    if (!profile) return null;
    return { id: profile.id, email, displayName: profile.displayName ?? session?.user?.name ?? null };
  }

  // Ya tenemos id, traemos displayName (sin fallo si no existe)
  const up = await prisma.userProfile.findUnique({ where: { email }, select: { displayName: true } });
  return { id, email, displayName: up?.displayName ?? session?.user?.name ?? null };
}
