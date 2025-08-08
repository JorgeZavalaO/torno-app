import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Permisos base (ajusta según tu dominio)
  const permissions = [
    { code: "roles.read", description: "Ver roles" },
    { code: "roles.write", description: "Crear/editar/eliminar roles" },
    { code: "permissions.read", description: "Ver permisos" },
    { code: "permissions.write", description: "Crear/editar/eliminar permisos" },
    { code: "users.assignRoles", description: "Asignar roles a usuarios" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: p,
      update: {},
    });
  }

  // Roles
  const admin = await prisma.role.upsert({
    where: { name: "admin" },
    create: { name: "admin", description: "Administrador del sistema" },
    update: {},
  });

  const operator = await prisma.role.upsert({
    where: { name: "operator" },
    create: { name: "operator", description: "Operador" },
    update: {},
  });

  // Asignar todos los permisos al rol admin
  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: perm.id } },
      create: { roleId: admin.id, permissionId: perm.id },
      update: {},
    });
  }

  console.log("Seed completado");
}

main().finally(async () => prisma.$disconnect());
