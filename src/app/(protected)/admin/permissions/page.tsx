import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { prisma } from "@/app/lib/prisma";
import PermissionsClient from "./permissions.client";
import { createPermission, updatePermission, deletePermission } from "./actions";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/handler/sign-in");

  const canRead = await userHasPermission(user.email, "permissions.read");
  if (!canRead) redirect("/");

  const [permissions, canWrite] = await Promise.all([
    prisma.permission.findMany({ orderBy: { createdAt: "desc" } }),
    userHasPermission(user.email, "permissions.write"),
  ]);

  return (
    <PermissionsClient
      initialItems={permissions}
      canWrite={canWrite}
      actions={{ createPermission, updatePermission, deletePermission }}
    />
  );
}
