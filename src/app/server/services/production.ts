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
  for(const id of otIds){
    revalidateTag(cacheTags.workorder(id));
    revalidateTag(cacheTags.worklogs(id));
  }
  revalidateTag(cacheTags.workorders);
  revalidatePath("/ot","page");
  revalidatePath("/control","page");
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
  await prisma.parteProduccion.createMany({ data: parsed.data.entries.map(e=>({ otId: e.otId, userId: e.userId ?? user.id, horas: D(e.horas), maquina: e.maquina ?? null, nota: e.nota ?? null })) });
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

  // El cliente Prisma genera modelos con nombres originales; accedemos vía (prisma as any) para evitar romper hasta regenerar tipos.
  type RawPieza = { id:string; productoId:string|null; qtyPlan:Prisma.Decimal; qtyHecha:Prisma.Decimal };
  // Prisma genera el cliente según nombres originales (OTPieza). Usamos cast controlado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pzClient: { findMany: (args: unknown)=>Promise<RawPieza[]> } = (prisma as unknown as { oTPieza: any }).oTPieza;
  const piezasInfo = await pzClient.findMany({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where:{ id:{ in: items.map(i=>i.piezaId) }, otId } as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select:{ id:true, productoId:true, qtyPlan:true, qtyHecha:true } as any
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

  await prisma.$transaction(async (tx)=>{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txPz: { update: (args: unknown)=>Promise<unknown> } = (tx as unknown as { oTPieza:any }).oTPieza;
    for(const it of items){
      const pz = piezaMap.get(it.piezaId); if(!pz) continue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await txPz.update({ where:{ id: it.piezaId }, data:{ qtyHecha:{ increment: D(it.cantidad) } } } as any);
      if(pz.productoId){
        const prod = await tx.producto.findUnique({ where:{ sku: pz.productoId }, select:{ costo:true } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await tx.movimiento.create({ data:{ productoId: pz.productoId, tipo: "INGRESO_OT" as any, cantidad: D(it.cantidad), costoUnitario: D(Number(prod?.costo ?? 0)), refTabla:"OT", refId: ot.codigo, nota:"Producción terminada" } as any });
      }
    }
  });
  bump([otId]);
  return { ok:true as const, message:"Producción registrada" };
}
