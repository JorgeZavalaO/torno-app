import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import RolesClient from "./roles.client";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/handler/sign-in");

  const canRead = await userHasPermission(user.email, "roles.read");
  if (!canRead) redirect("/");

  // fetch desde el server (lleva cookies automáticamente)
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/roles`, {
    cache: "no-store",
    headers: { "x-from": "roles-page" },
  });
  const roles = await res.json();

  const canWrite = await userHasPermission(user.email, "roles.write");

  return <RolesClient initialItems={roles} canWrite={canWrite} />;
}
