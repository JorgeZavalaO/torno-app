import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import PermissionsClient from "./permissions.client";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/handler/sign-in");

  const canRead = await userHasPermission(user.email, "permissions.read");
  if (!canRead) redirect("/");

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/permissions`, { cache: "no-store" });
  const permissions = await res.json();
  const canWrite = await userHasPermission(user.email, "permissions.write");

  return <PermissionsClient initialItems={permissions} canWrite={canWrite} />;
}
