import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { cacheTags } from "@/app/lib/cache-tags";

export const getClientsCached = cache(
  async () =>
    prisma.cliente.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, nombre: true, ruc: true, email: true, telefono: true,
        direccion: true, contactoNombre: true, contactoTelefono: true,
        activo: true, createdAt: true,
      },
    }),
  ["clients:list"],
  { tags: [cacheTags.clients], revalidate: 300 } // 5 minutos - evita cache infinito
);
