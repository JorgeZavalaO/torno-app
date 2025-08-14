// src/server/auth.ts
import NextAuth, { type User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import type { Provider } from "next-auth/providers";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const { email, password } = CredentialsSchema.parse(raw);
      const emailNorm = email.toLowerCase();

      const user = await prisma.userProfile.findUnique({
        where: { email: emailNorm },
        select: { id: true, email: true, displayName: true, passwordHash: true },
      });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, email: user.email, name: user.displayName ?? null };
    },
  }),
];

// (opcional) si algún día agregas OAuth, aquí lo verás.
// Para solo credentials, quedará vacío:
export const providerMap = providers
  .map((p) => (typeof p === "function" ? p() : p))
  .map((p) => ({ id: p.id, name: p.name }))
  .filter((p) => p.id !== "credentials");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/error",
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      const u = user as (NextAuthUser & { id?: string }) | undefined;
      if (u?.id) {
        // agregamos propiedad custom
        (token as JWT & { uid?: string }).uid = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as JWT & { uid?: string };
      if (session.user && t.uid) {
        (session.user as { id?: string }).id = t.uid;
      }
      return session;
    },
  },
});
