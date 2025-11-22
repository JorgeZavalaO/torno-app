"use server";

import { z } from "zod";
import { CategoryEnum } from "@/lib/product-categories";
import { CategoriaProducto } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanReadInventory, assertCanWriteInventory } from "@/app/lib/guards";
import { generateSKU } from "./sku";
import { getProductsWithStock } from "@/app/server/queries/inventory";

type Result = { ok: true; message?: string; sku?: string; imported?: number } | { ok: false; message: string };
type r = Result;

const D = (n: number | string) => new Prisma.Decimal(n ?? 0);
const optionalPositiveNumber = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  return val;
}, z.coerce.number().positive().gt(0));

/**
 * Calcula el costo promedio ponderado de un producto basado en los ingresos por compras.
 * Considera solo los últimos N movimientos de INGRESO_COMPRA para evitar impacto de 
 * ajustes o movimientos muy antiguos.
 */
async function calculateWeightedAverageCost(
  tx: Prisma.TransactionClient, 
  productoId: string, 
  newQuantity: number, 
  newCost: number,
  maxMovements: number = 10
): Promise<number> {
  // Obtener los últimos movimientos de ingreso por compra
  const movimientos = await tx.movimiento.findMany({
    where: { 
      productoId, 
      tipo: "INGRESO_COMPRA",
      cantidad: { gt: 0 } // Solo ingresos positivos
    },
    orderBy: { fecha: "desc" },
    take: maxMovements,
    select: { cantidad: true, costoUnitario: true }
  });

  // Calcular totales existentes
  const existingTotal = movimientos.reduce((acc, mov) => 
    acc + (Number(mov.cantidad) * Number(mov.costoUnitario)), 0
  );
  const existingQuantity = movimientos.reduce((acc, mov) => 
    acc + Number(mov.cantidad), 0
  );

  // Agregar el nuevo movimiento al cálculo
  const totalValue = existingTotal + (newQuantity * newCost);
  const totalQuantity = existingQuantity + newQuantity;

  // Evitar división por cero
  if (totalQuantity <= 0) return newCost;

  const averageCost = totalValue / totalQuantity;
  
  // Redondear a 2 decimales para consistencia
  return Math.round(averageCost * 100) / 100;
}

const ProductSchema = z.object({
  sku: z.string().min(1),
  nombre: z.string().min(2),
  categoria: CategoryEnum,
  uom: z.string().min(1),
  costo: z.coerce.number().min(0),
  stockMinimo: z.coerce.number().min(0).optional().nullable(),
  material: z.string().max(100).optional(),
  milimetros: z.coerce.number().min(0).optional(),
  pulgadas: z.coerce.number().min(0).optional(),
  requiereTrazabilidad: z.coerce.boolean().optional().default(false),
  vidaUtilEstimada: optionalPositiveNumber.optional(),
}).refine(data => {
  if (!data.requiereTrazabilidad) return true;
  return typeof data.vidaUtilEstimada === "number" && data.vidaUtilEstimada > 0;
}, {
  message: "La vida útil estimada es obligatoria cuando se requiere trazabilidad",
  path: ["vidaUtilEstimada"],
});

// Schema modificado para la creación donde SKU es opcional (se generará automáticamente)
const CreateProductSchema = ProductSchema.omit({ sku: true }).extend({
  sku: z.string().min(1).optional(),
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

/* ---------------- Códigos equivalentes (ERP) ---------------- */
const EqCodeCreateSchema = z.object({
  productoId: z.string().min(1),
  sistema: z.string().min(2).max(50),
  codigo: z.string().min(1).max(100),
  descripcion: z.string().max(200).optional(),
});

const EqCodeDeleteSchema = z.object({ id: z.string().uuid() });

export async function addEquivalentCode(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  const parsed = EqCodeCreateSchema.safeParse({
    productoId: fd.get("productoId"),
    sistema: fd.get("sistema"),
    codigo: fd.get("codigo"),
    descripcion: (fd.get("descripcion") || undefined) as string | undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del código" };
  const { productoId, sistema, codigo, descripcion } = parsed.data;
  try {
    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { sku: productoId },
      select: { sku: true }
    });
    if (!producto) return { ok: false, message: "Producto no encontrado" };

    // Crear código equivalente usando Prisma Client
    await prisma.productoCodigoEquivalente.create({
      data: {
        productoId,
        sistema,
        codigo,
        descripcion,
      },
    });
    revalidateTag(cacheTags.inventoryProducts);
    revalidateTag(cacheTags.inventoryKardex(productoId));
    revalidatePath(`/inventario/${encodeURIComponent(productoId)}`, "page");
    return { ok: true, message: "Código agregado" };
  } catch (e: unknown) {
    // Posible violación de unicidad (sistema+codigo)
    const err = e as { code?: string } | undefined;
    if (err && err.code === 'P2002') {
      return { ok: false, message: "El código ya existe en ese sistema" };
    }
    console.error(e);
    return { ok: false, message: "No se pudo agregar el código" };
  }
}

export async function removeEquivalentCode(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  const parsed = EqCodeDeleteSchema.safeParse({ id: fd.get("id") });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };
  const { id } = parsed.data;
  try {
    // Obtener productoId antes de eliminar
    const eqCode = await prisma.productoCodigoEquivalente.findUnique({
      where: { id },
      select: { productoId: true }
    });
    if (!eqCode) return { ok: false, message: "Código no encontrado" };

    // Eliminar usando Prisma Client
    await prisma.productoCodigoEquivalente.delete({
      where: { id }
    });

    revalidateTag(cacheTags.inventoryProducts);
    revalidateTag(cacheTags.inventoryKardex(eqCode.productoId));
    revalidatePath(`/inventario/${encodeURIComponent(eqCode.productoId)}`, "page");
    return { ok: true, message: "Código eliminado" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "No se pudo eliminar el código" };
  }
}

export async function getProductEquivalentCodes(sku: string): Promise<Array<{ id: string; sistema: string; codigo: string; descripcion?: string | null }>> {
  await assertCanReadInventory();
  try {
    const codes = await prisma.productoCodigoEquivalente.findMany({
      where: { productoId: sku },
      select: {
        id: true,
        sistema: true,
        codigo: true,
        descripcion: true,
      },
      orderBy: [
        { sistema: 'asc' },
        { codigo: 'asc' }
      ]
    });
    return codes;
  } catch (e) {
    // Si la tabla no existe aún, retornar vacío
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('does not exist')) {
      return [];
    }
    throw e;
  }
}

function bumpAll() {
  revalidateTag(cacheTags.inventoryProducts);
  revalidateTag(cacheTags.inventoryMovs);
  revalidatePath("/inventario", "page");
}

export async function pingInventory(): Promise<void> {
  await assertCanReadInventory();
}

export async function createProduct(fd: FormData): Promise<r> {
  await assertCanWriteInventory();
  const parsed = CreateProductSchema.safeParse({
    sku: fd.get("sku") || undefined,
    nombre: fd.get("nombre"),
    categoria: fd.get("categoria"),
    uom: fd.get("uom"),
    costo: fd.get("costo"),
    stockMinimo: fd.get("stockMinimo") ?? null,
    material: fd.get("material") || undefined,
    milimetros: fd.get("milimetros") || undefined,
    pulgadas: fd.get("pulgadas") || undefined,
    requiereTrazabilidad: fd.get("requiereTrazabilidad") ?? undefined,
    vidaUtilEstimada: fd.get("vidaUtilEstimada") ?? undefined,
  });
  
  if (!parsed.success) {
    // Mostrar el primer error de validación
    const firstError = parsed.error.issues[0];
    const fieldName = firstError.path.join('.');
    console.error('Error de validación:', parsed.error.issues);
    return { 
      ok: false, 
      message: `Error en ${fieldName}: ${firstError.message}` 
    };
  }
  const { nombre, categoria, uom, costo, stockMinimo, material, milimetros, pulgadas, requiereTrazabilidad, vidaUtilEstimada } = parsed.data;
  // Leer equivalentes opcionales en formato JSON (array de objetos)
  let equivalentes: Array<{ sistema: string; codigo: string; descripcion?: string } > = [];
  const rawEq = fd.get('equivalentes');
  
  if (rawEq && typeof rawEq === 'string') {
    try {
      const arr = JSON.parse(rawEq);
      if (Array.isArray(arr)) {
        equivalentes = arr
          .filter(x => x && typeof x.sistema === 'string' && typeof x.codigo === 'string')
          .map(x => ({ sistema: x.sistema, codigo: x.codigo, descripcion: x.descripcion }))
          .slice(0, 20); // límite de seguridad
      }
    } catch (parseError) {
      console.warn('Error parseando equivalentes JSON:', parseError);
      // ignorar json inválido
    }
  }

  try {

    // Si no se proporcionó SKU, generarlo automáticamente
    const manual = parsed.data.sku?.toString().trim().toUpperCase();
    const sku = manual && manual.length > 0 ? manual : await generateSKU(categoria);
    
    await prisma.producto.create({
      data: {
        sku, nombre, categoria: categoria as CategoriaProducto, uom,
        costo: D(costo),
        stockMinimo: stockMinimo != null ? D(stockMinimo) : null,
        material: material || null,
        milimetros: milimetros != null ? D(milimetros) : null,
        pulgadas: pulgadas != null ? D(pulgadas) : null,
        requiereTrazabilidad: Boolean(requiereTrazabilidad),
        vidaUtilEstimada: typeof vidaUtilEstimada === "number" ? D(vidaUtilEstimada) : null,
      },
    });

    // Intentar insertar códigos equivalentes si se enviaron
    if (equivalentes.length > 0) {
      try {
        for (const eq of equivalentes) {
          await prisma.productoCodigoEquivalente.create({
            data: {
              productoId: sku,
              sistema: eq.sistema,
              codigo: eq.codigo,
              descripcion: eq.descripcion,
            },
          });
        }
        // invalidaciones relacionadas
        revalidateTag(cacheTags.inventoryKardex(sku));
      } catch (e) {
        console.warn('Error insertando códigos equivalentes:', e);
        const msg = e instanceof Error ? e.message : '';
        // Si hay error de unicidad, continuar pero registrar
        if (msg.includes('P2002')) {
          console.warn('Algunos códigos equivalentes ya existían y no se insertaron');
        } else {
          // Para otros errores, fallar la creación del producto
          throw e;
        }
      }
    }
    bumpAll();
    return { ok: true, message: "Producto creado", sku };
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, message: "SKU ya existe" };
    }
    console.error(e);
    return { ok: false, message: "No se pudo crear el producto" };
  }
}

export async function updateProduct(fd: FormData): Promise<r> {
  await assertCanWriteInventory();
  const parsed = ProductSchema.safeParse({
    sku: fd.get("sku"),
    nombre: fd.get("nombre"),
    categoria: fd.get("categoria"),
    uom: fd.get("uom"),
    costo: fd.get("costo"),
    stockMinimo: fd.get("stockMinimo") ?? null,
    material: fd.get("material") || undefined,
    milimetros: fd.get("milimetros") || undefined,
    pulgadas: fd.get("pulgadas") || undefined,
    requiereTrazabilidad: fd.get("requiereTrazabilidad") ?? undefined,
    vidaUtilEstimada: fd.get("vidaUtilEstimada") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos del producto" };
  const { sku, nombre, categoria, uom, costo, stockMinimo, material, milimetros, pulgadas, requiereTrazabilidad, vidaUtilEstimada } = parsed.data;

  try {
    await prisma.producto.update({
      where: { sku },
      data: {
        nombre, categoria: categoria as unknown as CategoriaProducto, uom,
        costo: D(costo),
        stockMinimo: stockMinimo != null ? D(stockMinimo) : null,
        material: material || null,
        milimetros: milimetros != null ? D(milimetros) : null,
        pulgadas: pulgadas != null ? D(pulgadas) : null,
        requiereTrazabilidad: Boolean(requiereTrazabilidad),
        vidaUtilEstimada: typeof vidaUtilEstimada === "number" ? D(vidaUtilEstimada) : null,
      },
    });
    bumpAll();
    return { ok: true, message: "Producto actualizado" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "No se pudo actualizar" };
  }
}

export async function deleteProduct(sku: string): Promise<r> {
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

export async function createMovement(fd: FormData): Promise<r> {
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

      // Política de costo: calcular promedio ponderado para ingresos por compra
      if (sign(tipo) === 1) {
        if (tipo === "INGRESO_COMPRA") {
          // Calcular costo promedio ponderado para ingresos por compra
          const avgCost = await calculateWeightedAverageCost(
            tx, 
            productoId, 
            cantidad, 
            costoUnitario
          );
          await tx.producto.update({
            where: { sku: productoId },
            data: { costo: D(avgCost) },
          });
        } else {
          // Para otros tipos de ingreso, usar el costo unitario directo
          await tx.producto.update({
            where: { sku: productoId },
            data: { costo: D(costoUnitario) },
          });
        }
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

// Nueva función para importar productos desde CSV
export async function importProducts(file: File): Promise<r> {
  await assertCanWriteInventory();
  
  try {
    // Importar xlsx dinámicamente (solo en servidor)
    const XLSX = await import('xlsx');
    
    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | boolean | null)[][];
    
    if (jsonData.length < 2) {
      return { 
        ok: false, 
        message: "El archivo Excel está vacío o no tiene datos" 
      };
    }
    
    // Verificar cabecera
    const headers = jsonData[0].map((h) => String(h ?? '').trim());
    const expectedHeaders = ['Nombre', 'Categoría', 'UOM', 'Costo', 'StockMinimo', 'Material', 'Milimetros', 'Pulgadas'];
    const requiredHeaders = ['Nombre', 'Categoría', 'UOM', 'Costo'];
    
    // Validar que al menos tenga las columnas requeridas
    const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
    if (!hasRequiredHeaders) {
      return { 
        ok: false, 
        message: `Formato de Excel inválido. Las columnas requeridas son: ${requiredHeaders.join(', ')}. Columnas opcionales: ${expectedHeaders.slice(4).join(', ')}` 
      };
    }
    
    // Obtener índices de columnas
    const getColumnIndex = (header: string) => headers.indexOf(header);
    const nombreIdx = getColumnIndex('Nombre');
    const categoriaIdx = getColumnIndex('Categoría');
    const uomIdx = getColumnIndex('UOM');
    const costoIdx = getColumnIndex('Costo');
    const stockMinimoIdx = getColumnIndex('StockMinimo');
    const materialIdx = getColumnIndex('Material');
    const milimetrosIdx = getColumnIndex('Milimetros');
    const pulgadasIdx = getColumnIndex('Pulgadas');
    
    // Procesar filas de datos (ignorar cabecera)
    const dataRows = jsonData.slice(1);
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const row of dataRows) {
      if (!row || row.length === 0 || !row[nombreIdx]) {
        skippedCount++;
        continue;
      }
      
      const nombre = String(row[nombreIdx] || '').trim();
      const categoria = String(row[categoriaIdx] || '').trim();
      const uom = String(row[uomIdx] || '').trim();
      const costoStr = String(row[costoIdx] || '0').trim();
      const stockMinimoStr = row[stockMinimoIdx] !== undefined && row[stockMinimoIdx] !== '' ? String(row[stockMinimoIdx]).trim() : null;
      const material = row[materialIdx] !== undefined && row[materialIdx] !== '' ? String(row[materialIdx]).trim() : null;
      const milimetrosStr = row[milimetrosIdx] !== undefined && row[milimetrosIdx] !== '' ? String(row[milimetrosIdx]).trim() : null;
      const pulgadasStr = row[pulgadasIdx] !== undefined && row[pulgadasIdx] !== '' ? String(row[pulgadasIdx]).trim() : null;
      
      // Validar datos mínimos
      if (!nombre || !categoria || !uom) {
        skippedCount++;
        continue;
      }
      
      // Validar categoría
      if (!['MATERIA_PRIMA', 'HERRAMIENTA_CORTE', 'CONSUMIBLE', 'REPUESTO', 'FABRICACION'].includes(categoria)) {
        skippedCount++;
        continue;
      }
      
      // Parsear números
      const costo = parseFloat(costoStr) || 0;
      const stockMinimo = stockMinimoStr ? parseFloat(stockMinimoStr) : null;
      const milimetros = milimetrosStr ? parseFloat(milimetrosStr) : null;
      const pulgadas = pulgadasStr ? parseFloat(pulgadasStr) : null;
      
      // Generar SKU automático
      const sku = await generateSKU(categoria);
      
      // Crear producto
      await prisma.producto.create({
        data: {
          sku,
          nombre,
          categoria: categoria as CategoriaProducto,
          uom,
          costo: D(costo),
          stockMinimo: stockMinimo !== null ? D(stockMinimo) : null,
          material: material || null,
          milimetros: milimetros !== null ? D(milimetros) : null,
          pulgadas: pulgadas !== null ? D(pulgadas) : null,
        },
      });
      
      importedCount++;
    }
    
    bumpAll();
    
    const message = skippedCount > 0 
      ? `${importedCount} productos importados correctamente, ${skippedCount} filas omitidas`
      : `${importedCount} productos importados correctamente`;
    
    return { ok: true, message, imported: importedCount };
  } catch (e) {
    console.error("Error al importar productos:", e);
    return { ok: false, message: `Error al procesar el archivo Excel: ${e instanceof Error ? e.message : 'Error desconocido'}` };
  }
}

/**
 * Buscar productos con término de búsqueda (incluye códigos equivalentes)
 */
export async function searchProducts(searchTerm?: string) {
  await assertCanReadInventory();
  
  if (!searchTerm?.trim()) {
    return getProductsWithStock();
  }
  
  return getProductsWithStock(searchTerm);
}

/**
 * Recalcula los costos promedio ponderado de todos los productos basado en su historial de compras.
 * Útil para aplicar la nueva lógica a productos existentes.
 */
export async function recalculateAllProductCosts(): Promise<Result> {
  await assertCanWriteInventory();
  
  try {
    const productos = await prisma.producto.findMany({
      select: { sku: true }
    });

    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const producto of productos) {
        // Obtener movimientos de ingreso por compra para este producto
        const movimientos = await tx.movimiento.findMany({
          where: { 
            productoId: producto.sku, 
            tipo: "INGRESO_COMPRA",
            cantidad: { gt: 0 }
          },
          orderBy: { fecha: "desc" },
          take: 10, // Últimos 10 movimientos
          select: { cantidad: true, costoUnitario: true }
        });

        if (movimientos.length === 0) continue; // Sin historial de compras

        // Calcular promedio ponderado
        const totalValue = movimientos.reduce((acc, mov) => 
          acc + (Number(mov.cantidad) * Number(mov.costoUnitario)), 0
        );
        const totalQuantity = movimientos.reduce((acc, mov) => 
          acc + Number(mov.cantidad), 0
        );

        if (totalQuantity > 0) {
          const averageCost = Math.round((totalValue / totalQuantity) * 100) / 100;
          
          await tx.producto.update({
            where: { sku: producto.sku },
            data: { costo: new Prisma.Decimal(averageCost) }
          });
          
          updatedCount++;
        }
      }
    });

    bumpAll();
    
    return { 
      ok: true, 
      message: `Costos recalculados para ${updatedCount} productos` 
    };
  } catch (error) {
    console.error("Error recalculando costos:", error);
    return { 
      ok: false, 
      message: "Error al recalcular costos de productos" 
    };
  }
}

// Nuevas funciones para gestionar la vida útil específica de máquinas
const MachineLifeSchema = z.object({
  productoId: z.string().min(1),
  machineCategoryId: z.string().min(1),
  vidaUtil: z.coerce.number().positive(),
});

export async function addMachineLife(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  const parsed = MachineLifeSchema.safeParse({
    productoId: fd.get("productoId"),
    machineCategoryId: fd.get("machineCategoryId"),
    vidaUtil: fd.get("vidaUtil"),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };
  const { productoId, machineCategoryId, vidaUtil } = parsed.data;

  try {
    await prisma.productoVidaCategoria.upsert({
      where: {
        productoId_machineCategoryId: {
          productoId,
          machineCategoryId,
        },
      },
      update: {
        vidaUtil: D(vidaUtil),
      },
      create: {
        productoId,
        machineCategoryId,
        vidaUtil: D(vidaUtil),
      },
    });
    revalidateTag(cacheTags.inventoryKardex(productoId));
    revalidatePath(`/inventario/${encodeURIComponent(productoId)}`, "page");
    return { ok: true, message: "Vida útil configurada" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "No se pudo guardar la configuración" };
  }
}

export async function removeMachineLife(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  const id = fd.get("id") as string;
  if (!id) return { ok: false, message: "ID requerido" };

  try {
    const record = await prisma.productoVidaCategoria.delete({
      where: { id },
    });
    revalidateTag(cacheTags.inventoryKardex(record.productoId));
    revalidatePath(`/inventario/${encodeURIComponent(record.productoId)}`, "page");
    return { ok: true, message: "Configuración eliminada" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "No se pudo eliminar" };
  }
}

const BulkStockSchema = z.object({
  items: z.array(z.object({
    sku: z.string().min(1),
    cantidad: z.coerce.number().positive(),
    costoUnitario: z.coerce.number().min(0),
    tipo: z.enum(["INGRESO_AJUSTE", "SALIDA_AJUSTE"]).optional().default("INGRESO_AJUSTE"),
  })).min(1),
  nota: z.string().optional(),
});

export async function registerInitialBalances(fd: FormData): Promise<Result> {
  await assertCanWriteInventory();
  
  const rawItems = fd.get("items");
  const nota = fd.get("nota") as string | undefined;

  if (!rawItems) return { ok: false, message: "No se enviaron items" };

  let items: unknown[] = [];
  try {
    items = JSON.parse(String(rawItems));
  } catch {
    return { ok: false, message: "Formato de items inválido" };
  }

  const parsed = BulkStockSchema.safeParse({ items, nota });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { items: validItems, nota: validNota } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of validItems) {
        const tipo = item.tipo || "INGRESO_AJUSTE";
        const sign = tipo === "SALIDA_AJUSTE" ? -1 : 1;
        const cantidad = sign * item.cantidad;

        // Validar stock disponible para salidas
        if (tipo === "SALIDA_AJUSTE") {
          const current = await tx.movimiento.aggregate({
            where: { productoId: item.sku },
            _sum: { cantidad: true },
          });
          const currentStock = Number(current._sum.cantidad?.toString() ?? 0);
          
          if (currentStock < item.cantidad) {
            throw new Error(
              `Stock insuficiente para ${item.sku}: disponible ${currentStock}, solicitado ${item.cantidad}`
            );
          }
        }

        // Crear movimiento
        await tx.movimiento.create({
          data: {
            productoId: item.sku,
            tipo: tipo,
            cantidad: D(cantidad),
            costoUnitario: D(item.costoUnitario),
            nota: validNota || (tipo === "SALIDA_AJUSTE" ? "Ajuste de Salida" : "Ajuste de Ingreso"),
          },
        });

        // Actualizar costo del producto (solo para ingresos)
        if (tipo === "INGRESO_AJUSTE") {
          await tx.producto.update({
            where: { sku: item.sku },
            data: { costo: D(item.costoUnitario) },
          });

          // 🆕 Para ingresos de herramientas: crear automáticamente instancias de ToolInstance
          const producto = await tx.producto.findUnique({
            where: { sku: item.sku },
            select: { categoria: true, vidaUtilEstimada: true }
          });

          if (producto && (producto.categoria === "HERRAMIENTA" || producto.categoria === "HERRAMIENTA_CORTE")) {
            // Crear una instancia por cada unidad ingresada
            const cantidadInt = Math.floor(Number(item.cantidad));
            for (let i = 0; i < cantidadInt; i++) {
              // Generar código único: SKU-TIMESTAMP-SECUENCIA
              const timestamp = Date.now();
              const codigo = `${item.sku}-${timestamp}-${i + 1}`;

              await tx.toolInstance.create({
                data: {
                  productoId: item.sku,
                  codigo,
                  estado: "NUEVA",
                  ubicacion: "Almacén",
                  costoInicial: D(item.costoUnitario),
                  vidaUtilEstimada: producto.vidaUtilEstimada || undefined,
                },
              });
            }
          }
        }
      }
    });

    bumpAll();
    return { ok: true, message: `${validItems.length} movimientos registrados correctamente` };
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Error al registrar movimientos";
    return { ok: false, message };
  }
}
