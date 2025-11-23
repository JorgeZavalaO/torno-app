"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/app/lib/cache-tags";
import { assertCanReadClients, assertCanWriteClients } from "@/app/lib/guards";

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

const ClientSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "Nombre requerido"),
  ruc: z.string().min(8, "RUC inválido"),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  contactoNombre: z.string().optional().or(z.literal("")),
  contactoTelefono: z.string().optional().or(z.literal("")),
  activo: z.boolean().default(true),
});

function bumpClientsCache() {
  revalidateTag(cacheTags.clients);
  revalidatePath("/clientes", "page");
}

/* --- Limpiar caché forzadamente --- */
export async function clearClientsCache(): Promise<ActionResult> {
  await assertCanWriteClients();
  try {
    bumpClientsCache();
    return { ok: true, message: "Caché de clientes invalidado" };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* --- List (si quieres llamar desde RSC) --- */
export async function listClients() {
  await assertCanReadClients();
  return prisma.cliente.findMany({ orderBy: { createdAt: "desc" } });
}

/* --- Create --- */
export async function createClient(fd: FormData): Promise<ActionResult> {
  await assertCanWriteClients();
  const parsed = ClientSchema.safeParse({
    nombre: fd.get("nombre"),
    ruc: fd.get("ruc"),
    email: fd.get("email") || undefined,
    telefono: fd.get("telefono") || undefined,
    direccion: fd.get("direccion") || undefined,
    contactoNombre: fd.get("contactoNombre") || undefined,
    contactoTelefono: fd.get("contactoTelefono") || undefined,
    activo: (fd.get("activo") ?? "true") === "true",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  try {
    await prisma.cliente.create({ data: parsed.data });
    bumpClientsCache();
    return { ok: true, message: "Cliente creado" };
  } catch (e) {
    // Tipificamos el error de Prisma
    const prismaError = e as { code?: string; message?: string };
    if (prismaError?.code === "P2002") return { ok: false, message: "El RUC ya existe" };
    return { ok: false, message: "No se pudo crear" };
  }
}

/* --- Update --- */
export async function updateClient(fd: FormData): Promise<ActionResult> {
  await assertCanWriteClients();
  const parsed = ClientSchema.extend({ id: z.string().uuid() }).safeParse({
    id: fd.get("id"),
    nombre: fd.get("nombre"),
    ruc: fd.get("ruc"),
    email: fd.get("email") || undefined,
    telefono: fd.get("telefono") || undefined,
    direccion: fd.get("direccion") || undefined,
    contactoNombre: fd.get("contactoNombre") || undefined,
    contactoTelefono: fd.get("contactoTelefono") || undefined,
    activo: (fd.get("activo") ?? "true") === "true",
  });
  if (!parsed.success) {
    return { 
      ok: false, 
      message: parsed.error.issues[0]?.message || "Datos inválidos" 
    };
  }

  const { id, ...data } = parsed.data;
  try {
    await prisma.cliente.update({ where: { id }, data });
    bumpClientsCache();
    return { ok: true, message: "Cliente actualizado" };
  } catch {
    return { ok: false, message: "No se pudo actualizar" };
  }
}

/* --- Delete --- */
export async function deleteClient(fd: FormData): Promise<ActionResult> {
  await assertCanWriteClients();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, message: "ID requerido" };

  try {
    await prisma.cliente.delete({ where: { id } });
    bumpClientsCache();
    return { ok: true, message: "Cliente eliminado" };
  } catch {
    return { ok: false, message: "No se pudo eliminar" };
  }
}

/* --- Import (.xlsx o .csv) --- */
export async function importClients(file: File): Promise<ActionResult> {
  await assertCanWriteClients();

  const buffer = Buffer.from(await file.arrayBuffer());

  // Importar xlsx solo si es necesario
  let rows: Record<string, string>[] = [];
  
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    try {
      // NextJS Server Action: Manejo seguro para cargar xlsx
      let xlsx;
      try {
        xlsx = await import("xlsx");
      } catch {
        return { ok: false, message: "El módulo xlsx no está instalado. Ejecute 'npm install xlsx' primero." };
      }
      
      const wb = xlsx.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(ws, { defval: "" }) as Record<string, string>[];
    } catch {
      return { ok: false, message: "Error al procesar archivo Excel" };
    }
  } else {
    try {
      const text = buffer.toString("utf-8").trim();
      const [h, ...rest] = text.split(/\r?\n/);
      const headers = h.split(",").map((s) => s.trim());
      rows = rest.map((line) => {
        const cols = line.split(",").map((s) => s.trim());
        const o: Record<string, string> = {};
        headers.forEach((k, i) => (o[k] = cols[i] ?? ""));
        return o;
      });
    } catch {
      return { ok: false, message: "Error al procesar archivo CSV" };
    }
  }

  const norm = (v: unknown): string => (typeof v === "string" ? v.trim() : String(v || ""));
  const toBool = (v: unknown): boolean => String(v || "").toLowerCase().startsWith("a"); // Activo/activo

  const payload = rows.map((r) => ({
    nombre: norm(r.nombre),
    ruc: norm(r.ruc),
    email: norm(r.email) || null,
    telefono: norm(r.telefono) || null,
    direccion: norm(r.direccion) || null,
    contactoNombre: norm(r.contactoNombre) || null,
    contactoTelefono: norm(r.contactoTelefono) || null,
    activo: r.estado ? toBool(r.estado) : true,
  })).filter(x => Boolean(x.nombre) && Boolean(x.ruc));

  await prisma.$transaction(
    payload.map((c) =>
      prisma.cliente.upsert({
        where: { ruc: c.ruc },
        create: c,
        update: c,
      })
    )
  );

  bumpClientsCache();
  return { ok: true, message: "Importación completa" };
}
