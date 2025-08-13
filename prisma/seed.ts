import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "jzavalaolivares@gmail.com";

async function main() {
  // Lista completa de permisos reflejando los guards
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
  // Upsert permisos (idempotente)
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: p,
      update: { description: p.description },
    });
  }

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

  console.log("Asignando todos los permisos al rol 'admin'...");
  const allPerms = await prisma.permission.findMany();

  // Transacción para asignación de permisos al rol admin
  const permOps = allPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: admin.id, permissionId: perm.id },
      },
      create: { roleId: admin.id, permissionId: perm.id },
      update: {},
    })
  );
  await prisma.$transaction(permOps);

  // --- Asignar rol admin al usuario dado (crear usuario si no existe) ---
  console.log(`Buscando/creando usuario con email: ${ADMIN_EMAIL}`);

  const user = await prisma.userProfile.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      stackUserId: randomUUID(), // si tienes el stackUserId real del proveedor auth, reemplázalo aquí
      email: ADMIN_EMAIL,
      displayName: "Admin (seed)",
    },
    update: {
      displayName: "Admin (seed)",
    },
  });

  console.log(`Usuario encontrado/creado: id=${user.id} email=${user.email}`);

  console.log("Asignando rol 'admin' al usuario...");

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: admin.id },
    },
    create: {
      userId: user.id,
      roleId: admin.id,
    },
    update: {},
  });

  console.log("Usuario con rol admin creado/asignado correctamente.");
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
