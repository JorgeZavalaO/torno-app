import { signIn } from "@/server/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/admin/roles");

  async function doRegister(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: String(formData.get("email") || "").toLowerCase(),
        password: String(formData.get("password") || ""),
        // si necesitas más datos (ej. name), agrégalo en tu provider de Auth.js
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
            <input
              name="name"
              type="text"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <button className="w-full rounded-md border px-4 py-2">
            Registrarse
          </button>
        </form>
      </div>
    </div>
  );
}
