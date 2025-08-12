import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";

export default async function NewQuotePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const canWrite = await userHasPermission(me.email, "quotes.write");
  if (!canWrite) redirect("/cotizador");

  // Redirigir a la página principal ya que ahora usamos el modal
  redirect("/cotizador");
}
