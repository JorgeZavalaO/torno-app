import { NextResponse } from 'next/server';
import { getReclamosList } from '@/app/server/queries/reclamos';
import { assertCanReadReclamos, assertCanWriteReclamos } from '@/app/lib/guards';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const CreateReclamoSchema = z.object({
  clienteId: z.string().uuid(),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().min(1).max(1000),
  prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
  categoria: z.string().optional(),
  tipoReclamo: z.enum(['OT_ATENDIDA', 'NUEVO_RECLAMO']).default('NUEVO_RECLAMO'),
  otReferenciaId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    await assertCanReadReclamos();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(url.searchParams.get('pageSize') ?? '10') || 10;
  const q = url.searchParams.get('q') ?? undefined;
  const estado = url.searchParams.get('estado') ?? undefined;
  const clienteId = url.searchParams.get('clienteId') ?? undefined;

  try {
    const data = await getReclamosList({ page, pageSize, q, estado, clienteId });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await assertCanWriteReclamos();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = CreateReclamoSchema.parse(body);

    // Generar código único para el reclamo
    const year = new Date().getFullYear();
    const totalReclamosThisYear = await prisma.reclamo.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const nextNumber = totalReclamosThisYear + 1;
    const codigo = `REC-${year}-${String(nextNumber).padStart(4, '0')}`;

    const reclamo = await prisma.reclamo.create({
      data: {
        codigo,
        clienteId: validated.clienteId,
        titulo: validated.titulo,
        descripcion: validated.descripcion,
        prioridad: validated.prioridad,
        categoria: validated.categoria,
        tipoReclamo: validated.tipoReclamo,
        otReferenciaId: validated.otReferenciaId,
        estado: 'PENDING',
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
        otReferencia: { select: { id: true, codigo: true } },
      },
    });

    return NextResponse.json(reclamo);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}