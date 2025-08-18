import { signIn } from "@/server/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/admin/roles");

  async function doRegister(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").toLowerCase();
    const password = String(formData.get("password") || "");

    if (!name || !email || !password) {
      redirect(`/error?error=MissingFields`);
    }

    // Verifica si ya existe
    const exists = await prisma.userProfile.findUnique({ where: { email } });
    if (exists) {
      redirect(`/error?error=UserExists`);
    }

    // Crea usuario en tu dominio
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.userProfile.create({
      data: {
        email,
        displayName: name,
        passwordHash,
        stackUserId: "",
      },
    });

    // Luego inicia sesión
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/admin/roles",
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect(`/error?error=${e.type}`);
      }
      throw e;
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold text-center">Crear cuenta</h1>

        <form action={doRegister} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm">Nombre</label>
            <input name="name" type="text" required className="w-full rounded border px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm">Email</label>
            <input name="email" type="email" required className="w-full rounded border px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm">Password</label>
            <input name="password" type="password" required className="w-full rounded border px-3 py-2" />
          </div>
          <button className="w-full rounded-md border px-4 py-2">Registrarse</button>
        </form>
      </div>
    </div>
  );
}
