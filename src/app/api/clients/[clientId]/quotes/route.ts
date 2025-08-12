import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getQuotesByClientIdPlain } from "@/app/server/queries/quotes";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await ctx.params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const canRead = await userHasPermission(me.email, "quotes.read");
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getQuotesByClientIdPlain(clientId, 50);
  // Reducir payload para lista rápida
  const minimal = data.map(q => ({
    id: q.id,
    createdAt: q.createdAt.toISOString(),
    status: q.status,
    total: q.total,
    unitPrice: q.unitPrice,
  }));
  return NextResponse.json(minimal);
}
