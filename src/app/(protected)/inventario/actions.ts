"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanReadInventory, assertCanWriteInventory } from "@/app/lib/guards";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

const ProductSchema = z.object({
  sku: z.string().min(1),
  nombre: z.string().min(2),
  categoria: z.enum(["MATERIA_PRIMA","HERRAMIENTA_CORTE","CONSUMIBLE","REPUESTO"]),
  uom: z.string().min(1),
  costo: z.coerce.number().min(0),
  stockMinimo: z.coerce.number().min(0).optional().nullable(),
});

const MovementSchema = z.object({
  productoId: z.string().min(1),
  tipo: z.enum(["INGRESO_COMPRA","INGRESO_AJUSTE","SALIDA_AJUSTE","SALIDA_OT"]),
  cantidad: z.coerce.number().positive(), // ingresado siempre en positivo
  costoUnitario: z.coerce.number().min(0), // requerido también en salida para valoración
  refTabla: z.string().optional(),
  refId: z.string().optional(),
  nota: z.string().max(300).optional(),
});

function bumpAll() {
  revalidateTag(cacheTags.inventoryProducts);
  revalidateTag(cacheTags.inventoryMovs);
  revalidatePath("/inventario", "page");
}

export async function pingInventory(): Promise<void> {
  await assertCanReadInventory();
}

export async function createProduct(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  const parsed = ProductSchema.safeParse({
    sku: fd.get("sku"),
    nombre: fd.get("nombre"),
    categoria: fd.get("categoria"),
    uom: fd.get("uom"),
    costo: fd.get("costo"),
    stockMinimo: fd.get("stockMinimo") ?? null,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del producto" };
  const { sku, nombre, categoria, uom, costo, stockMinimo } = parsed.data;

  try {
    await prisma.producto.create({
      data: {
        sku, nombre, categoria, uom,
        costo: D(costo),
        stockMinimo: stockMinimo != null ? D(stockMinimo) : null,
      },
    });
    bumpAll();
    return { ok: true, message: "Producto creado" };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, message: "SKU ya existe" };
    }
    console.error(e);
    return { ok: false, message: "No se pudo crear el producto" };
  }
}

export async function updateProduct(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  const parsed = ProductSchema.safeParse({
    sku: fd.get("sku"),
    nombre: fd.get("nombre"),
    categoria: fd.get("categoria"),
    uom: fd.get("uom"),
    costo: fd.get("costo"),
    stockMinimo: fd.get("stockMinimo") ?? null,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del producto" };
  const { sku, nombre, categoria, uom, costo, stockMinimo } = parsed.data;

  try {
    await prisma.producto.update({
      where: { sku },
      data: {
        nombre, categoria, uom,
        costo: D(costo),
        stockMinimo: stockMinimo != null ? D(stockMinimo) : null,
      },
    });
    bumpAll();
    return { ok: true, message: "Producto actualizado" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "No se pudo actualizar" };
  }
}

export async function deleteProduct(sku: string): Promise<Result> {
  await assertCanWriteInventory();
  // No eliminar si tiene movimientos
  const count = await prisma.movimiento.count({ where: { productoId: sku } });
  if (count > 0) return { ok: false, message: "No se puede eliminar: tiene movimientos" };

  try {
    await prisma.producto.delete({ where: { sku } });
    bumpAll();
    return { ok: true, message: "Producto eliminado" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "No se pudo eliminar" };
  }
}

export async function createMovement(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  const parsed = MovementSchema.safeParse({
    productoId: fd.get("productoId"),
    tipo: fd.get("tipo"),
    cantidad: fd.get("cantidad"),
    costoUnitario: fd.get("costoUnitario"),
    refTabla: fd.get("refTabla") || undefined,
    refId: fd.get("refId") || undefined,
    nota: fd.get("nota") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del movimiento" };

  const { productoId, tipo, cantidad, costoUnitario, refTabla, refId, nota } = parsed.data;

  const sign = (t: typeof parsed.data.tipo) =>
    t === "SALIDA_AJUSTE" || t === "SALIDA_OT" ? -1 : 1;

  // Validar stock para salidas
  const current = await prisma.movimiento.aggregate({
    where: { productoId },
    _sum: { cantidad: true },
  });
  const currentStock = Number(current._sum.cantidad?.toString() ?? 0);
  const delta = sign(tipo) * cantidad;
  if (currentStock + delta < 0) {
    return { ok: false, message: "Stock insuficiente para la salida" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.movimiento.create({
        data: {
          productoId,
          tipo,
          cantidad: D(delta), // negativo en salidas
          costoUnitario: D(costoUnitario),
          refTabla: refTabla ?? null,
          refId: refId ?? null,
          nota: nota ?? null,
        },
      });

      // Política de costo: actualizar costo de referencia con el último ingreso
      if (sign(tipo) === 1) {
        await tx.producto.update({
          where: { sku: productoId },
          data: { costo: D(costoUnitario) },
        });
      }
    });

    revalidateTag(cacheTags.inventoryKardex(productoId));
    bumpAll();
    return { ok: true, message: "Movimiento registrado" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "No se pudo registrar el movimiento" };
  }
}
