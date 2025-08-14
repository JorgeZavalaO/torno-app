import { getCurrentUser } from "@/app/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Landing() {
  const user = await getCurrentUser();
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Torno Manager</h1>
        <p className="text-muted-foreground">Sistema de gestión para el Área de Torno.</p>
      </div>
      <div className="flex gap-3">
        {!user ? (
          <>
            <Button asChild><Link href="/login">Ingresar</Link></Button>
            <Button asChild variant="secondary"><Link href="/login">Crear cuenta</Link></Button>
          </>
        ) : (
          <Button asChild><Link href="/admin/roles">Ir al dashboard</Link></Button>
        )}
      </div>
      <footer className="text-xs text-muted-foreground">
        Conectado a Neon • Auth por Auth.js • Next.js + Prisma
      </footer>
    </main>
  );
}
