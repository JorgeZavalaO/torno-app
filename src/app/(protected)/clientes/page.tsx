import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getClientsCached } from "@/app/server/queries/clients";
import { getCostingValues } from "@/app/server/queries/costing-params";
import ClientesClient from "./clientes.client";
import { createClient, updateClient, deleteClient, importClients } from "./actions";

export default async function ClientesPage() {
  // Autenticación
  const user = await getCurrentUser();
  if (!user) redirect("/handler/sign-in");

  // Verificar permisos
  const [canRead, canWrite] = await Promise.all([
    userHasPermission(user.email, "clients.read"),
    userHasPermission(user.email, "clients.write"),
  ]);

  if (!canRead) redirect("/");

  // Cargar datos
  const [clients, params] = await Promise.all([getClientsCached(), getCostingValues()]);

  // Render con datos y acciones
  return (
    <ClientesClient
      initialItems={clients}
      canWrite={canWrite}
      params={params}
      actions={{
        createClient,
        updateClient,
        deleteClient,
        importClients,
      }}
    />
  );
}
