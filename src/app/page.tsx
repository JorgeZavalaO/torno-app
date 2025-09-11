import { getCurrentUser } from "@/app/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Torno Manager</h1>
        <p className="text-muted-foreground">
          Sistema de gestión para el Área de Torno. Controla pedidos, materiales y producción.
        </p>
      </div>

      <div className="flex gap-3">
        {!user ? (
          <>
            <Button asChild><Link href="/login">Ingresar</Link></Button>
            <Button asChild variant="secondary"><Link href="/sign-up">Crear cuenta</Link></Button>
          </>
        ) : (
          <Button asChild><Link href="/dashboard">Ir al dashboard</Link></Button>
        )}
      </div>

      <footer className="text-xs text-muted-foreground">
        Conectado a Neon • Auth por Neon Auth • Next.js + Prisma
      </footer>
    </main>
  );
}
