import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const ots = await prisma.ordenTrabajo.findMany({ select: { id: true, codigo: true }, orderBy: { creadaEn: 'desc' } });
    return NextResponse.json(ots);
  } catch {
    return NextResponse.json({ error: 'No se pudo obtener OTs' }, { status: 500 });
  }
}
