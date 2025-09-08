import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/app/lib/auth";
import { assertCanWriteWorkorders } from "@/app/lib/guards";
import { revalidateTag, revalidatePath } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { z } from "zod";

const D = (n: number | string) => new Prisma.Decimal(n ?? 0);

function bump(otIds: string[]){
  if(!otIds.length) return;
  
  // Invalidación granular por OT
  for(const id of otIds){
    revalidateTag(cacheTags.workorder(id));
    revalidateTag(cacheTags.worklogs(id));
  }
  
  // Invalidaciones globales
  revalidateTag(cacheTags.workorders);
  revalidateTag('production:overview');
  revalidateTag('production:summary');
  revalidateTag('realtime'); // Para dashboard
  
  // Paths que necesitan refrescarse
  revalidatePath("/ot","page");
  revalidatePath("/control","page");
  revalidatePath("/dashboard","page");
}

/* --------------------- Schemas --------------------- */
const SingleHoursSchema = z.object({
  otId: z.string().uuid(),
  horas: z.number().positive(),
  maquina: z.string().max(100).optional(),
  nota: z.string().max(300).optional(),
  // Acepta cuid o cualquier id de usuario válido de dominio (no forzar UUID)
  userId: z.string().min(1).optional(),
});

const BulkHoursSchema = z.object({
  entries: z.array(SingleHoursSchema).min(1)
});

const PiecesSchema = z.object({
  otId: z.string().uuid(),
  items: z.array(z.object({ piezaId: z.string().min(1), cantidad: z.number().positive() })).min(1)
});

export async function logHours(entry: z.infer<typeof SingleHoursSchema>){
  await assertCanWriteWorkorders();
  const me = await getCurrentUser();
  if(!me) return { ok:false as const, message:"Sesión inválida" };
  const user = await prisma.userProfile.findFirst({ where:{ email: me.email }, select:{ id:true } });
  if(!user) return { ok:false as const, message:"Usuario no registrado" };

  const parsed = SingleHoursSchema.safeParse(entry);
  if(!parsed.success) return { ok:false as const, message:"Datos inválidos del parte" };

  const targetUserId = parsed.data.userId ?? user.id;
  await prisma.parteProduccion.create({
    data:{ otId: parsed.data.otId, userId: targetUserId, horas: D(parsed.data.horas), maquina: parsed.data.maquina ?? null, nota: parsed.data.nota ?? null }
  });
  bump([parsed.data.otId]);
  return { ok:true as const, message:"Parte registrado" };
}

export async function logHoursBulk(entries: z.infer<typeof SingleHoursSchema>[]) {
  await assertCanWriteWorkorders();
  const me = await getCurrentUser();
  if(!me) return { ok:false as const, message:"Sesión inválida" };
  const user = await prisma.userProfile.findFirst({ where:{ email: me.email }, select:{ id:true } });
  if(!user) return { ok:false as const, message:"Usuario no registrado" };
  if (process.env.NODE_ENV !== "production") {
    console.debug("logHoursBulk entries:", entries);
  }
  const parsed = BulkHoursSchema.safeParse({ entries });
  if(!parsed.success) return { ok:false as const, message:"Datos inválidos" };

  const otIds = Array.from(new Set(parsed.data.entries.map(e=>e.otId)));
  await prisma.$transaction(async (tx)=>{
    await tx.parteProduccion.createMany({ data: parsed.data.entries.map(e=>({ otId: e.otId, userId: e.userId ?? user.id, horas: D(e.horas), maquina: e.maquina ?? null, nota: e.nota ?? null })) });
    // Si alguna OT está en OPEN y recibe horas, pasar a IN_PROGRESS
    const ots = await tx.ordenTrabajo.findMany({ where: { id: { in: otIds } }, select: { id: true, estado: true } });
    const toStart = ots.filter(o => o.estado === "OPEN").map(o => o.id);
    if (toStart.length) {
      await tx.ordenTrabajo.updateMany({ where: { id: { in: toStart } }, data: { estado: "IN_PROGRESS" } });
    }
  });
  bump(otIds);
  return { ok:true as const, message:"Partes registrados" };
}

export async function logPieces(payload: z.infer<typeof PiecesSchema>){
  await assertCanWriteWorkorders();
  if (process.env.NODE_ENV !== "production") {
    console.debug("logPieces payload:", payload);
  }
  const parsed = PiecesSchema.safeParse(payload);
  if(!parsed.success) return { ok:false as const, message:"Datos inválidos" };
  const { otId, items } = parsed.data;
  const ot = await prisma.ordenTrabajo.findUnique({ where:{ id: otId }, select:{ codigo:true } });
  if(!ot) return { ok:false as const, message:"OT no encontrada" };

  // Leer piezas afectadas y sus cantidades actuales
  const piezasInfo = await prisma.oTPieza.findMany({
    where: { id: { in: items.map(i => i.piezaId) }, otId },
    select: { id: true, productoId: true, qtyPlan: true, qtyHecha: true },
  });
  interface PzData { productoId:string|null; qtyPlan:number; qtyHecha:number }
  const piezaMap = new Map<string, PzData>(
    piezasInfo.map(p=>[
      p.id,
      { productoId:p.productoId, qtyPlan:Number(p.qtyPlan), qtyHecha:Number(p.qtyHecha) }
    ])
  );
  const errs:string[]=[];
  for(const it of items){
    const pz = piezaMap.get(it.piezaId);
    if(!pz){ errs.push("Pieza inválida"); continue; }
    if(pz.qtyHecha + it.cantidad > pz.qtyPlan) {
      errs.push("Cantidad supera el plan de la pieza");
    }
  }
  if(errs.length) return { ok:false as const, message: errs.join(" • ") };

  await prisma.$transaction(async (tx) => {
    // Precalcular costos por SKU para movimientos (una sola consulta)
    const neededSkus = Array.from(new Set(
      items
        .map(i => piezaMap.get(i.piezaId)?.productoId)
        .filter((s): s is string => !!s)
    ));
    const products = neededSkus.length
      ? await tx.producto.findMany({ where: { sku: { in: neededSkus } }, select: { sku: true, costo: true } })
      : [];
    const costBySku = new Map(products.map(p => [p.sku, Number(p.costo ?? 0)]));

    // Acumular movimientos para crear en batch
    const movs: Array<{ productoId: string; cantidad: Prisma.Decimal; costoUnitario: Prisma.Decimal; refTabla: string; refId: string; nota: string; tipo: 'INGRESO_OT' }>
      = [];

    for (const it of items) {
      const pz = piezaMap.get(it.piezaId);
      if (!pz) continue;

      await tx.oTPieza.update({ where: { id: it.piezaId }, data: { qtyHecha: { increment: D(it.cantidad) } } });
      if (pz.productoId) {
        const cu = costBySku.get(pz.productoId) ?? 0;
        movs.push({
          productoId: pz.productoId,
          tipo: 'INGRESO_OT',
          cantidad: D(it.cantidad),
          costoUnitario: D(cu),
          refTabla: 'OT',
          refId: ot.codigo,
          nota: 'Producción terminada',
        });
      }
    }

    if (movs.length) {
      await tx.movimiento.createMany({ data: movs });
      // Invalidar caché de inventario cuando se registra producción
      revalidateTag('inventory:stock');
      revalidateTag('inventory:products');
    }

    // Si la OT está en proceso y todas las piezas alcanzan el plan, marcar como DONE
    const curr = await tx.ordenTrabajo.findUnique({ where: { id: otId }, select: { estado: true } });
    if (curr?.estado === "IN_PROGRESS") {
      // Recalcular piezas tras la actualización
      const piezasPost = await tx.oTPieza.findMany({
        where: { otId },
        select: { qtyPlan: true, qtyHecha: true },
      });
      const allComplete = piezasPost.length > 0 && piezasPost.every(p => Number(p.qtyHecha) >= Number(p.qtyPlan));
      if (allComplete) {
        await tx.ordenTrabajo.update({ where: { id: otId }, data: { estado: "DONE" } });
      }
    }
  });
  bump([otId]);
  return { ok:true as const, message:"Producción registrada" };
}
