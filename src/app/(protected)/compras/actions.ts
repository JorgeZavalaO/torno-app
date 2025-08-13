"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanWritePurchases } from "@/app/lib/guards";
import { getCurrentUser } from "@/app/lib/auth";

type Result = { ok: true; message?: string; id?: string; codigo?: string } | { ok: false; message: string };
const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

function bump() {
  revalidateTag(cacheTags.purchasesSC);
  revalidateTag(cacheTags.purchasesOC);
  revalidateTag(cacheTags.providers);
  revalidatePath("/compras", "page");
}

/* ----------------- Proveedores ------------------ */
const ProviderSchema = z.object({
  nombre: z.string().min(2),
  ruc: z.string().min(8),
  contacto: z.string().optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
});

export async function createProvider(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = ProviderSchema.safeParse({
    nombre: fd.get("nombre"),
    ruc: fd.get("ruc"),
    contacto: fd.get("contacto") || undefined,
    email: fd.get("email") || undefined,
    telefono: fd.get("telefono") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del proveedor" };
  try {
    const p = await prisma.proveedor.create({ data: parsed.data, select: { id: true } });
    bump();
    return { ok: true, message: "Proveedor creado", id: p.id };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "RUC ya existe" };
    }
    return { ok: false, message: "No se pudo crear proveedor" };
  }
}

const ProviderUpdateSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(2).optional(),
  ruc: z.string().min(8).optional(),
  contacto: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
});

export async function updateProvider(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = ProviderUpdateSchema.safeParse({
    id: fd.get("id"),
    nombre: (fd.get("nombre") || undefined) as string | undefined,
    ruc: (fd.get("ruc") || undefined) as string | undefined,
    contacto: (fd.get("contacto") || undefined) as string | undefined,
    email: (fd.get("email") || undefined) as string | undefined,
    telefono: (fd.get("telefono") || undefined) as string | undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del proveedor" };

  const { id, ...rest } = parsed.data;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) {
      // convertir cadenas vacías a null para campos opcionales
      data[k] = v === "" ? null : v;
    }
  }

  try {
    await prisma.proveedor.update({ where: { id }, data });
    bump();
    return { ok: true, message: "Proveedor actualizado", id };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "RUC ya existe" };
    }
    return { ok: false, message: "No se pudo actualizar proveedor" };
  }
}

export async function deleteProvider(id: string): Promise<Result> {
  await assertCanWritePurchases();
  try {
    await prisma.proveedor.delete({ where: { id } });
    bump();
    return { ok: true, message: "Proveedor eliminado" };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code?: string }).code;
      if (code === "P2003") return { ok: false, message: "No se puede eliminar: tiene referencias" };
      if (code === "P2025") return { ok: false, message: "Proveedor no encontrado" };
    }
    return { ok: false, message: "No se pudo eliminar proveedor" };
  }
}

/* ----------------- Solicitudes de Compra (SC) ------------------ */
const SCItemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.coerce.number().positive(),
  costoEstimado: z.coerce.number().min(0).optional().nullable(),
});
const SCSchema = z.object({
  otId: z.string().optional(),
  notas: z.string().max(500).optional(),
  items: z.array(SCItemSchema).min(1),
});

export async function createSC(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesión inválida" };

  // items vienen en JSON
  const json = fd.get("items") as string;
  const parsed = SCSchema.safeParse({
    otId: (fd.get("otId") || undefined) as string | undefined,
    notas: (fd.get("notas") || undefined) as string | undefined,
    items: json ? JSON.parse(json) : [],
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos de solicitud" };

  const { otId, notas, items } = parsed.data;
  const totalEstimado = items.reduce(
    (acc, it) => acc + (Number(it.costoEstimado ?? 0) * Number(it.cantidad)),
    0
  );

  const solicitante = await prisma.userProfile.findFirst({ where: { email: user.email } });
  if (!solicitante) return { ok: false, message: "Usuario no registrado" };

  const sc = await prisma.solicitudCompra.create({
    data: {
      solicitanteId: solicitante.id,
      otId: otId || null,
      estado: "PENDING_ADMIN",
      totalEstimado: D(totalEstimado),
      notas: notas || null,
      items: {
        create: items.map((it) => ({
          productoId: it.productoId,
          cantidad: D(it.cantidad),
          costoEstimado: it.costoEstimado != null ? D(it.costoEstimado) : null,
        })),
      },
    },
    select: { id: true },
  });

  bump();
  return { ok: true, id: sc.id, message: "Solicitud de compra creada" };
}

export async function setSCState(scId: string, estado: "PENDING_ADMIN"|"PENDING_GERENCIA"|"APPROVED"|"REJECTED"|"CANCELLED", nota?: string): Promise<Result> {
  await assertCanWritePurchases();
  const sc = await prisma.solicitudCompra.findUnique({ where: { id: scId }, select: { estado: true } });
  if (!sc) return { ok: false, message: "SC no encontrada" };

  // Reglas simples de transición
  const allowed = new Set([
    "PENDING_ADMIN:PENDING_GERENCIA",
    "PENDING_GERENCIA:APPROVED",
    "PENDING_ADMIN:REJECTED",
    "PENDING_GERENCIA:REJECTED",
    "APPROVED:CANCELLED",
    "PENDING_ADMIN:CANCELLED",
    "PENDING_GERENCIA:CANCELLED",
  ]);
  const key = `${sc.estado}:${estado}`;
  if (!allowed.has(key) && sc.estado !== estado) {
    return { ok: false, message: `Transición no permitida (${sc.estado} → ${estado})` };
  }

  await prisma.solicitudCompra.update({
    where: { id: scId },
    data: {
      estado,
      notas: nota ?? undefined,
      updatedAt: new Date(),
    },
  });

  bump();
  return { ok: true, message: "Estado actualizado" };
}

/* ----------------- Orden de Compra (OC) ------------------ */
const OCCreateSchema = z.object({
  scId: z.string().uuid(),
  proveedorId: z.string().uuid(),
  codigo: z.string().min(3),
  items: z.array(z.object({
    productoId: z.string().min(1),
    cantidad: z.coerce.number().positive(),
    costoUnitario: z.coerce.number().min(0),
  })).min(1),
});

export async function createOC(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = OCCreateSchema.safeParse({
    scId: fd.get("scId"),
    proveedorId: fd.get("proveedorId"),
    codigo: fd.get("codigo"),
    items: JSON.parse(String(fd.get("items") || "[]")),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos de OC" };

  const { scId, proveedorId, codigo, items } = parsed.data;

  // Validaciones básicas
  const sc = await prisma.solicitudCompra.findUnique({ where: { id: scId }, select: { estado: true } });
  if (!sc) return { ok: false, message: "SC no existe" };
  if (sc.estado !== "APPROVED") return { ok: false, message: "SC debe estar APROBADA" };

  const total = items.reduce((acc, it) => acc + (it.costoUnitario * it.cantidad), 0);

  try {
    const oc = await prisma.ordenCompra.create({
      data: {
        scId, proveedorId, codigo,
        estado: "OPEN",
        total: D(total),
        items: {
          create: items.map(it => ({
            productoId: it.productoId,
            cantidad: D(it.cantidad),
            costoUnitario: D(it.costoUnitario),
          })),
        },
      },
      select: { id: true, codigo: true },
    });
    bump();
    return { ok: true, id: oc.id, codigo: oc.codigo, message: "OC creada" };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, message: "Código de OC ya existe" };
    }
    return { ok: false, message: "No se pudo crear OC" };
  }
}

/**
 * Recepción completa de OC (MVP): ingresa todo lo pendiente a Inventario con costo de la OC.
 * Si quieres recepción parcial, este método puede recibir items seleccionados con cantidades recibidas.
 */
const OCReceiveSchema = z.object({
  ocId: z.string().uuid(),
  facturaUrl: z.string().url().optional(),
});

export async function receiveOC(fd: FormData): Promise<Result> {
  await assertCanWritePurchases();
  const parsed = OCReceiveSchema.safeParse({
    ocId: fd.get("ocId"),
    facturaUrl: (fd.get("facturaUrl") || undefined) as string | undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos de recepción" };

  const { ocId, facturaUrl } = parsed.data;

  const oc = await prisma.ordenCompra.findUnique({
    where: { id: ocId },
    include: { items: true },
  });
  if (!oc) return { ok: false, message: "OC no encontrada" };
  if (oc.estado !== "OPEN") return { ok: false, message: "La OC no está abierta" };

  await prisma.$transaction(async (tx) => {
    // 1) Movimientos de inventario (INGRESO_COMPRA) por cada item
    for (const it of oc.items) {
      await tx.movimiento.create({
        data: {
          productoId: it.productoId,
          tipo: "INGRESO_COMPRA",
          cantidad: it.cantidad,        // positivo
          costoUnitario: it.costoUnitario,
          refTabla: "OC",
          refId: oc.codigo,
          nota: "Recepción OC",
        },
      });
      // 2) Actualizar costo de referencia del producto con el último ingreso
      await tx.producto.update({
        where: { sku: it.productoId },
        data: { costo: it.costoUnitario },
      });
    }

    // 3) Marcar OC como RECEIVED (MVP). Si quieres manejo de cierre, puedes dejar RECEIVED y luego CLOSED tras factura.
    await tx.ordenCompra.update({
      where: { id: oc.id },
      data: {
        estado: "RECEIVED",
        facturaUrl: facturaUrl || null,
        fecha: new Date(),
      },
    });
  });

  bump();
  return { ok: true, message: "Mercadería recepcionada" };
}
