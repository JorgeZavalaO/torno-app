"use server";

import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
// import { assertCanManageSystem } from "@/app/lib/guards"; // Pendiente de integración de guardas

const EmpresaSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido"),
  ruc: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  web: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function updateEmpresa(fd: FormData) {
  // Verificar permisos (ajustar según tu sistema de permisos)
  // await assertCanManageSystem(); 
  
  const raw = {
    nombre: fd.get("nombre"),
    ruc: fd.get("ruc"),
    direccion: fd.get("direccion"),
    telefono: fd.get("telefono"),
    email: fd.get("email"),
    web: fd.get("web"),
    logoUrl: fd.get("logoUrl"),
  };

  const parsed = EmpresaSchema.safeParse(raw);
  
  if (!parsed.success) {
    return { ok: false, message: "Datos inválidos", errors: parsed.error.flatten() };
  }

  const data = parsed.data;

  try {
    await prisma.empresa.upsert({
      where: { id: "main" },
      update: {
        nombre: data.nombre,
        ruc: data.ruc || null,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        email: data.email || null,
        web: data.web || null,
        logoUrl: data.logoUrl || null,
      },
      create: {
        id: "main",
        nombre: data.nombre,
        ruc: data.ruc || null,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        email: data.email || null,
        web: data.web || null,
        logoUrl: data.logoUrl || null,
      },
    });

    // Revalidar la página de configuración y cualquier vista que consuma estos datos
    revalidatePath("/admin/empresa");
    return { ok: true, message: "Datos de empresa actualizados" };
  } catch (error) {
    console.error("Error updating empresa:", error);
    return { ok: false, message: "Error al guardar los datos" };
  }
}
