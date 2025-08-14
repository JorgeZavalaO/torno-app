// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "jzavalaolivares@gmail.com";

async function main() {
  // 1) Permisos (idempotente)
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

  console.log("Creando/actualizando permisos...");
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: p,
      update: { description: p.description },
    });
  }

  // 2) Roles
  console.log("Creando/actualizando roles...");
  const admin = await prisma.role.upsert({
    where: { name: "admin" },
    create: { name: "admin", description: "Administrador del sistema" },
    update: { description: "Administrador del sistema" },
  });

  const operator = await prisma.role.upsert({
    where: { name: "operator" },
    create: { name: "operator", description: "Operador" },
    update: { description: "Operador" },
  });

  // 3) Asignar todos los permisos al rol admin (transacción)
  console.log("Asignando todos los permisos al rol 'admin'...");
  const allPerms = await prisma.permission.findMany();
  const permOps = allPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: admin.id, permissionId: perm.id },
      },
      create: { roleId: admin.id, permissionId: perm.id },
      update: {},
    })
  );
  if (permOps.length > 0) await prisma.$transaction(permOps);

  // 4) Crear/actualizar usuario en la tabla de Auth.js (User)
  // IMPORTANT: requiere que el modelo `User` exista en tu schema.prisma (migración aplicada)
  console.log(`Creando/actualizando user Auth.js con email ${ADMIN_EMAIL}...`);
  const authUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      // image?: puedes setear una URL si quieres
    },
    update: {
      name: "Admin",
    },
  });

  console.log(`User Auth.js creado/actualizado id=${authUser.id}`);

  // 5) Crear/actualizar perfil de dominio (UserProfile) y vincular authUserId
  // Mantengo stackUserId con randomUUID() como legacy id por compatibilidad.
  console.log(`Creando/actualizando UserProfile para ${ADMIN_EMAIL}...`);
  const userProfile = await prisma.userProfile.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      stackUserId: randomUUID(),
      email: ADMIN_EMAIL,
      displayName: "Admin (seed)",
      // vincula el auth user
      authUserId: authUser.id,
    },
    update: {
      displayName: "Admin (seed)",
      authUserId: authUser.id,
    },
  });

  console.log(`UserProfile id=${userProfile.id} vinculado a authUserId=${authUser.id}`);

  // 6) Asignar rol admin al UserProfile
  console.log("Asignando rol 'admin' al userProfile...");
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: userProfile.id, roleId: admin.id } },
    create: { userId: userProfile.id, roleId: admin.id },
    update: {},
  });

  console.log("Seed completado correctamente.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
