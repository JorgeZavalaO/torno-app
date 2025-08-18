import { signOut } from "@/server/auth";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export default function SignOutPage() {
  async function doSignOut() {
    "use server";
    // Si tu helper admite redirectTo, úsalo; si no, solo await signOut()
    await signOut({ redirectTo: "/login" } as { redirectTo: string });
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </CardTitle>
          <CardDescription>
            ¿Seguro que deseas cerrar tu sesión? Tendrás que iniciar sesión
            nuevamente para acceder al sistema.
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex justify-end gap-2">
          <Link href="/dashboard">
            <Button variant="outline">Cancelar</Button>
          </Link>

          <form action={doSignOut}>
            <Button type="submit" variant="destructive">
              Cerrar sesión
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
