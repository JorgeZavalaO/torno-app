// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const ADMIN_EMAIL = "jzavalaolivares@gmail.com";
const ADMIN_PASS = "TuPasswordSegura123!"; // cámbiala o toma de env

async function main() {
  // permisos
  const permissions = [
    { code: "roles.read", description: "Ver roles" },
    { code: "roles.write", description: "Crear/editar/eliminar roles" },
    { code: "permissions.read", description: "Ver permisos" },
    { code: "permissions.write", description: "Crear/editar/eliminar permisos" },
    { code: "users.assignRoles", description: "Asignar roles a usuarios" },
    { code: "clients.read", description: "Ver clientes" },
    { code: "clients.write", description: "Crear/editar/eliminar clientes" },
    { code: "settings.costing.read", description: "Ver parámetros de costeo" },
    { code: "settings.costing.write", description: "Editar parámetros de costeo" },
    { code: "quotes.read", description: "Ver cotizaciones" },
    { code: "quotes.write", description: "Crear/editar/cancelar cotizaciones" },
    { code: "inventory.read", description: "Ver inventario" },
    { code: "inventory.write", description: "Modificar inventario" },
    { code: "purchases.read", description: "Ver compras / solicitudes" },
    { code: "purchases.write", description: "Crear/editar compras / solicitudes" },
    { code: "workorders.read", description: "Ver órdenes de trabajo" },
    { code: "workorders.write", description: "Crear/editar órdenes de trabajo" },
  ];
  for (const p of permissions) {
    await prisma.permission.upsert({ where: { code: p.code }, create: p, update: { description: p.description } });
  }

  // roles
  const admin = await prisma.role.upsert({
    where: { name: "admin" },
    create: { name: "admin", description: "Administrador del sistema" },
    update: { description: "Administrador del sistema" },
  });
  await prisma.role.upsert({
    where: { name: "operator" },
    create: { name: "operator", description: "Operador" },
    update: { description: "Operador" },
  });

  // permisos → admin
  const allPerms = await prisma.permission.findMany();
  await prisma.$transaction(
    allPerms.map((perm) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: admin.id, permissionId: perm.id } },
        create: { roleId: admin.id, permissionId: perm.id },
        update: {},
      })
    )
  );

  // admin con passwordHash
  const hash = await bcrypt.hash(ADMIN_PASS, 10);
  const up = await prisma.userProfile.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      stackUserId: randomUUID(),
      email: ADMIN_EMAIL.toLowerCase(),
      displayName: "Admin Seed",
      passwordHash: hash,
    },
    update: {
      displayName: "Admin Seed",
      passwordHash: hash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: up.id, roleId: admin.id } },
    create: { userId: up.id, roleId: admin.id },
    update: {},
  });

  console.log(`✔ Admin seed: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
}

main().finally(() => prisma.$disconnect());
