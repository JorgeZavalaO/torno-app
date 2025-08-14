import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Nuevos permisos a crear y asociar al rol admin
const NEW_PERMS = [
  { code: "machines.read", description: "Ver máquinas" },
  { code: "machines.write", description: "Gestionar máquinas" },
  { code: "production.read", description: "Ver tablero de producción" },
  { code: "production.write", description: "Registrar producción (horas/piezas)" },
];

async function main() {
  // Asegurar rol admin
  const admin = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "Administrador" },
  });

  // Crear (o mantener) permisos
  for (const p of NEW_PERMS) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: { code: p.code, description: p.description },
    });

    // Relacionar con admin si no existe
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: admin.id, permissionId: perm.id },
    });
  }

  console.log("Permisos creados/asignados al rol admin:");
  NEW_PERMS.forEach(p => console.log(" -", p.code));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(()=> prisma.$disconnect());
