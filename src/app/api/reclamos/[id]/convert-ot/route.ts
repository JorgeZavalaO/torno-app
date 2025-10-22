import { NextResponse } from 'next/server';
import { assertCanApproveReclamos } from '@/app/lib/guards';
import { prisma } from '@/app/lib/prisma';
import { EstadoReclamo } from '@prisma/client';

export async function POST(
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
    // Verificar que el reclamo existe y está aprobado
    const reclamo = await prisma.reclamo.findUnique({
      where: { id },
      include: { cliente: true },
    });

    if (!reclamo) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }

    if (reclamo.estado !== 'APPROVED') {
      return NextResponse.json({ error: "El reclamo debe estar aprobado para convertirlo a OT" }, { status: 400 });
    }

    if (reclamo.otId) {
      return NextResponse.json({ error: "Este reclamo ya fue convertido a OT" }, { status: 400 });
    }

    // Generar código de OT
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `OT-${y}${m}-`;
    const last = await prisma.ordenTrabajo.findFirst({
      where: { codigo: { startsWith: prefix } },
      orderBy: { creadaEn: "desc" },
      select: { codigo: true },
    });
    const n = last ? parseInt(last.codigo.slice(prefix.length)) + 1 : 1;
    const codigo = `${prefix}${String(n).padStart(4, "0")}`;

    // Crear OT
    const ot = await prisma.ordenTrabajo.create({
      data: {
        codigo,
        clienteId: reclamo.clienteId,
        notas: `Reclamo: ${reclamo.titulo}\n${reclamo.descripcion}`,
        prioridad: 'MEDIUM', // Default, puede ajustarse
        estado: 'OPEN',
      },
      select: { id: true, codigo: true },
    });

    // Actualizar reclamo con referencia a OT y cambiar estado
    await prisma.reclamo.update({
      where: { id },
      data: {
        otId: ot.id,
        estado: 'CONVERTED_TO_OT' as EstadoReclamo,
      },
    });

    return NextResponse.json({
      success: true,
      ot: ot,
      message: `OT ${ot.codigo} creada exitosamente desde el reclamo`,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}