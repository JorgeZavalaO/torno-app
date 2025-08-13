import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getOTsCached } from "@/app/server/queries/ot";
import { prisma } from "@/app/lib/prisma";
import OTClient from "./ot.client";
import { createOT, setOTState, addMaterial, issueMaterials, createSCFromShortages  } from "./actions";

export default async function OTPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");

  const [canRead, canWrite] = await Promise.all([
    userHasPermission(me.email, "workorders.read"),
    userHasPermission(me.email, "workorders.write"),
  ]);
  if (!canRead) redirect("/");

  const [rows, products] = await Promise.all([
    getOTsCached(),
    prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { sku: true, nombre: true, uom: true } }),
  ]);

  return (
    <OTClient
        canWrite={canWrite}
        rows={rows}
        products={products}
        actions={{ createOT, setOTState, addMaterial, issueMaterials, createSCFromShortages }}
    />
  );
}
