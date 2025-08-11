import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getClientsCached } from "@/app/server/queries/clients";
import ClientesClient from "./clientes.client";
import { createClient, updateClient, deleteClient, importClients } from "./actions";

export default async function ClientesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "clients.read"),
    userHasPermission(me.email, "clients.write"),
  ]);
  if (!canRead) redirect("/");

  const clients = await getClientsCached();

  return (
    <ClientesClient
      initialItems={clients}
      canWrite={canWrite}
      actions={{ createClient, updateClient, deleteClient, importClients }}
    />
  );
}
