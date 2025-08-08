import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { prisma } from "@/app/lib/prisma";
import RolesClient from "./roles.client";
import { createRole, updateRole, deleteRole } from "./actions";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/handler/sign-in");

  const canRead = await userHasPermission(user.email, "roles.read");
  if (!canRead) redirect("/");

  const roles = await prisma.role.findMany({ orderBy: { createdAt: "desc" } });
  const canWrite = await userHasPermission(user.email, "roles.write");

  return (
    <RolesClient
      initialItems={roles}
      canWrite={canWrite}
      actions={{ createRole, updateRole, deleteRole }}
    />
  );
}
