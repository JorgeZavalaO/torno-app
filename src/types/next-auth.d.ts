import "next-auth";
import "next-auth/jwt";

type AppUser = { id: string; email: string; name: string | null };

declare module "next-auth" {
  interface Session {
    user?: AppUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: AppUser;
  }
}
