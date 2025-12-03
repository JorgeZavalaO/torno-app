import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/app/lib/prisma";

export const getEmpresaCached = cache(
  async () => {
    const empresa = await prisma.empresa.findUnique({
      where: { id: "main" },
    });
    
    // Si no existe, devolver valores por defecto (o null, pero mejor un objeto vacío seguro)
    if (!empresa) {
      return {
        id: "main",
        nombre: "Mi Empresa",
        ruc: "",
        direccion: "",
        telefono: "",
        email: "",
        web: "",
        logoUrl: null,
        updatedAt: new Date(),
      };
    }
    return empresa;
  },
  ["empresa:profile"]
);
