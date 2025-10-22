import { NextResponse } from 'next/server';
import { assertCanApproveReclamos } from '@/app/lib/guards';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';
import { EstadoReclamo, TipoResolucion, EstadoOT } from '@prisma/client';

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

    const updateData: {
      estado: EstadoReclamo;
      tipoResolucion?: TipoResolucion;
      notasResolucion?: string;
    } = {
      estado: validated.estado as EstadoReclamo,
    };

    if (validated.tipoResolucion) {
      updateData.tipoResolucion = validated.tipoResolucion as TipoResolucion;
    }

    if (validated.notasResolucion) {
      updateData.notasResolucion = validated.notasResolucion;
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