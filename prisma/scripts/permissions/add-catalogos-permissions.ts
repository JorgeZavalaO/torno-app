import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Agregando permisos de catálogos...");
  
  // Agregar permisos
  const permissions = [
    { code: "settings.catalogos.read", description: "Ver catálogos del sistema" },
    { code: "settings.catalogos.write", description: "Editar catálogos del sistema" },
  ];
  
  for (const p of permissions) {
    await prisma.permission.upsert({ 
      where: { code: p.code }, 
      create: p, 
      update: { description: p.description } 
    });
    console.log(`✓ ${p.code}`);
  }

  // Asignar permisos al rol admin
  const admin = await prisma.role.findUnique({ where: { name: "admin" } });
  if (admin) {
    for (const p of permissions) {
      const perm = await prisma.permission.findUnique({ where: { code: p.code } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: admin.id, permissionId: perm.id } },
          create: { roleId: admin.id, permissionId: perm.id },
          update: {},
        });
        console.log(`✓ admin -> ${p.code}`);
      }
    }
  }

  console.log("✅ Permisos de catálogos agregados correctamente");
}

main().finally(() => prisma.$disconnect());