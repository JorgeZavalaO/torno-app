import { NextResponse } from "next/server";
import { rescheduleOT } from "@/app/(protected)/ot/actions";

export async function POST(req: Request) {
  try {
    const { otId, fechaLimite } = await req.json();
    if (!otId || !fechaLimite) return NextResponse.json({ ok: false, message: "Datos incompletos" }, { status: 400 });
    const r = await rescheduleOT({ otId, fechaLimite });
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
