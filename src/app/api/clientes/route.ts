import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertCanReadClients } from "@/app/lib/guards";

export async function GET(request: NextRequest) {
  try {
    await assertCanReadClients();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const q = searchParams.get("q") || "";
  const clienteId = searchParams.get("clienteId") || "";

  const skip = (page - 1) * pageSize;

  const where: {
    activo: boolean;
    id?: string;
    OR?: Array<{
      nombre?: { contains: string; mode: "insensitive" };
      ruc?: { contains: string };
      email?: { contains: string; mode: "insensitive" };
    }>;
  } = {
    activo: true,
  };

  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { ruc: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  if (clienteId) {
    where.id = clienteId;
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        ruc: true,
        email: true,
        telefono: true,
        direccion: true,
        contactoNombre: true,
        contactoTelefono: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.cliente.count({ where }),
  ]);

  // Filtrar clientes con ID o nombre vacío
  const clientesValidos = clientes.filter(c => c.id?.trim() && c.nombre?.trim());

  return NextResponse.json({
    clientes: clientesValidos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}