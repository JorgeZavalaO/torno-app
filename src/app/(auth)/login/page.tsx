import { signIn, auth } from "@/server/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  async function doLogin(formData: FormData) {
    "use server";
    try {
      
      await signIn("credentials", {
        email: String(formData.get("email") || "").toLowerCase(),
        password: String(formData.get("password") || ""),
        redirectTo: "/dashboard",
      });
    } catch (e) {
      if (e instanceof AuthError) {
        // muestra la página de error personalizada
        redirect(`/error?error=${e.type}`);
      }
      throw e;
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold text-center">Inicia sesión</h1>

        <form action={doLogin} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm">Email</label>
            <input name="email" type="email" required className="w-full rounded border px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm">Password</label>
            <input name="password" type="password" required className="w-full rounded border px-3 py-2" />
          </div>
          <button className="w-full rounded-md border px-4 py-2">Continuar</button>
        </form>
      </div>
    </div>
  );
}
