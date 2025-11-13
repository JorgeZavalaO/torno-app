import { NextResponse } from 'next/server';
import { assertCanReadWorkorders } from '@/app/lib/guards';
import { getOTListPaged } from '@/app/server/queries/ot';

export async function GET(request: Request) {
  try {
    await assertCanReadWorkorders();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(url.searchParams.get('pageSize') ?? '10') || 10;
  const q = url.searchParams.get('q') ?? undefined;
  const prioridad = url.searchParams.get('prioridad') ?? undefined;
  const clienteId = url.searchParams.get('clienteId') ?? undefined;
  const sortBy = (url.searchParams.get('sortBy') as 'fecha'|'prioridad' | null) ?? undefined;
  const sortDir = (url.searchParams.get('sortDir') as 'asc'|'desc' | null) ?? undefined;

  try {
    const data = await getOTListPaged({ page, pageSize, q, prioridad, clienteId, sortBy, sortDir });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

