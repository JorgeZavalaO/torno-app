import { prisma } from '@/app/lib/prisma';
import { Prisma, EstadoReclamo } from '@prisma/client';

export interface ReclamoListRow {
  id: string;
  codigo?: string | null;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  categoria?: string;
  tipoReclamo: string;
  otReferenciaId?: string;
  tipoResolucion?: string;
  createdAt: Date;
  cliente?: {
    id: string;
    nombre: string;
  } | null;
  otReferencia?: {
    id: string;
    codigo: string;
  };
}

export const getReclamosList = async (filters: {
  page: number;
  pageSize: number;
  q?: string;
  estado?: string;
  clienteId?: string;
}): Promise<{
  reclamos: ReclamoListRow[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  const { page, pageSize, q, estado, clienteId } = filters;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ReclamoWhereInput = {};

  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: 'insensitive' } },
      { descripcion: { contains: q, mode: 'insensitive' } },
      { codigo: { contains: q, mode: 'insensitive' } },
      { otReferencia: { codigo: { contains: q, mode: 'insensitive' } } },
    ];
  }

  if (estado) {
    where.estado = estado as EstadoReclamo;
  }

  if (clienteId) {
    where.clienteId = clienteId;
  }

  const [reclamos, total] = await Promise.all([
    prisma.reclamo.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true } },
        otReferencia: { select: { id: true, codigo: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.reclamo.count({ where }),
  ]);

  return {
    reclamos: reclamos
      .filter(r => r.cliente?.id && r.cliente?.nombre) // Filtrar reclamos sin cliente válido
      .map(r => ({
        id: r.id,
        codigo: r.codigo || undefined,
        titulo: r.titulo,
        descripcion: r.descripcion,
        prioridad: r.prioridad,
        estado: r.estado,
        categoria: r.categoria || undefined,
        tipoReclamo: r.tipoReclamo,
        otReferenciaId: r.otReferenciaId || undefined,
        tipoResolucion: r.tipoResolucion || undefined,
        createdAt: r.createdAt,
        cliente: r.cliente,
        otReferencia: r.otReferencia || undefined,
      })),
    total,
    page,
    pageSize,
  };
};