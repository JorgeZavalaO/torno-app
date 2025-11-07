import { NextResponse } from 'next/server';
import { assertCanApproveReclamos, assertCanReadReclamos } from '@/app/lib/guards';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';
import { EstadoReclamo, TipoResolucion, EstadoOT } from '@prisma/client';
import { getCurrentUser } from '@/app/lib/auth';

const UpdateEstadoSchema = z.object({
  estado: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  tipoResolucion: z.enum(['OT_PENDIENTE', 'OT_NUEVA', 'REEMBOLSO', 'AJUSTE_STOCK', 'OTRO']).optional(),
  notasResolucion: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertCanApproveReclamos();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = UpdateEstadoSchema.parse(body);

    // Validar que si se aprueba, se especifique tipoResolucion
    if (validated.estado === 'APPROVED' && !validated.tipoResolucion) {
      return NextResponse.json({ error: "Debe especificar el tipo de resolución para reclamos aprobados" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      estado: validated.estado as EstadoReclamo,
    };

    if (validated.tipoResolucion) {
      (updateData as { tipoResolucion?: TipoResolucion }).tipoResolucion = validated.tipoResolucion as TipoResolucion;
    }

    if (typeof validated.notasResolucion === 'string') {
      (updateData as { notasResolucion?: string }).notasResolucion = validated.notasResolucion;
    }

    // Auditoría: quién y cuándo aprobó/rechazó
    const user = await getCurrentUser();
    if (validated.estado === 'APPROVED') {
      (updateData as { aprobadoPorId?: string | null }).aprobadoPorId = user?.id ?? null;
      (updateData as { aprobadoEn?: Date | null }).aprobadoEn = new Date();
      // Si no vino una nota específica, conservar la existente (no la sobreescribimos con undefined)
    }
    if (validated.estado === 'REJECTED') {
      (updateData as { rechazadoPorId?: string | null }).rechazadoPorId = user?.id ?? null;
      (updateData as { rechazadoEn?: Date | null }).rechazadoEn = new Date();
    }

    const reclamo = await prisma.reclamo.update({
      where: { id },
      data: updateData,
      include: {
        cliente: { select: { id: true, nombre: true } },
        otReferencia: { select: { id: true, codigo: true, estado: true } },
      },
    });

    // Si se aprueba y la resolución es OT_PENDIENTE, cambiar estado de la OT referenciada
    if (validated.estado === 'APPROVED' && validated.tipoResolucion === 'OT_PENDIENTE' && reclamo.otReferenciaId) {
      await prisma.ordenTrabajo.update({
        where: { id: reclamo.otReferenciaId },
        data: { estado: EstadoOT.OPEN },
      });
    }

    return NextResponse.json(reclamo);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertCanReadReclamos();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const reclamo = await prisma.reclamo.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true } },
        otReferencia: { select: { id: true, codigo: true } },
      },
    });

    if (!reclamo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Normalizar salida
    const out = {
      id: reclamo.id,
      codigo: reclamo.codigo || undefined,
      titulo: reclamo.titulo,
      descripcion: reclamo.descripcion,
      prioridad: reclamo.prioridad,
      estado: reclamo.estado,
      categoria: reclamo.categoria || undefined,
      tipoReclamo: reclamo.tipoReclamo,
      otReferenciaId: reclamo.otReferenciaId || undefined,
      tipoResolucion: reclamo.tipoResolucion || undefined,
      notasResolucion: (reclamo as { notasResolucion?: string | null }).notasResolucion || undefined,
      aprobadoPorId: (reclamo as { aprobadoPorId?: string | null }).aprobadoPorId || undefined,
      aprobadoEn: (reclamo as { aprobadoEn?: Date | null }).aprobadoEn?.toISOString() || undefined,
      rechazadoPorId: (reclamo as { rechazadoPorId?: string | null }).rechazadoPorId || undefined,
      rechazadoEn: (reclamo as { rechazadoEn?: Date | null }).rechazadoEn?.toISOString() || undefined,
      createdAt: reclamo.createdAt.toISOString(),
      cliente: reclamo.cliente || undefined,
      otReferencia: reclamo.otReferencia || undefined,
      archivos: reclamo.archivos || [],
    };

    return NextResponse.json(out);
  } catch (err) {
    console.error('Error fetching reclamo:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}