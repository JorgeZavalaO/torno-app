import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Añadiendo todos los permisos del sistema...");

  // Lista completa de permisos extraídos del archivo guards.ts
  const permissions = [
    // Roles
    { code: "roles.read", description: "Leer roles" },
    { code: "roles.write", description: "Crear, editar y eliminar roles" },

    // Permisos
    { code: "permissions.read", description: "Leer permisos" },
    { code: "permissions.write", description: "Crear, editar y eliminar permisos" },

    // Usuarios
    { code: "users.assignRoles", description: "Asignar roles a usuarios" },

    // Clientes
    { code: "clients.read", description: "Leer clientes" },
    { code: "clients.write", description: "Crear, editar y eliminar clientes" },

    // Configuración de costos
    { code: "settings.costing.read", description: "Leer configuración de costos" },
    { code: "settings.costing.write", description: "Editar configuración de costos" },
  // Configuración - Catálogos
  { code: "settings.catalogos.read", description: "Leer catálogos del sistema" },
  { code: "settings.catalogos.write", description: "Editar catálogos del sistema" },

    // Cotizaciones
    { code: "quotes.read", description: "Leer cotizaciones" },
    { code: "quotes.write", description: "Crear, editar y eliminar cotizaciones" },

    // Inventario
    { code: "inventory.read", description: "Leer inventario" },
    { code: "inventory.write", description: "Crear, editar y eliminar productos" },

    // Compras
    { code: "purchases.read", description: "Leer solicitudes de compra" },
    { code: "purchases.write", description: "Crear, editar y eliminar solicitudes de compra" },

    // Órdenes de trabajo
    { code: "workorders.read", description: "Leer órdenes de trabajo" },
    { code: "workorders.write", description: "Crear, editar y eliminar órdenes de trabajo" },

    // Máquinas
    { code: "machines.read", description: "Leer máquinas" },
    { code: "machines.write", description: "Crear, editar y eliminar máquinas" },

    // Producción
    { code: "production.read", description: "Leer producción" },
    { code: "production.write", description: "Crear, editar y eliminar registros de producción" },
  ];

  // Crear o actualizar permisos
  const createdPermissions = [];
  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: { code: perm.code },
      create: perm,
      update: perm,
    });
    createdPermissions.push(permission);
    console.log(`✅ Permiso creado/actualizado: ${perm.code}`);
  }

  // Obtener o crear rol admin
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    create: {
      name: "admin",
      description: "Administrador con acceso completo"
    },
    update: {},
  });

  console.log(`👑 Rol admin: ${adminRole.name}`);

  // Asignar todos los permisos al rol admin
  let assignedCount = 0;
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      },
      create: {
        roleId: adminRole.id,
        permissionId: permission.id
      },
      update: {},
    });
    assignedCount++;
  }

  console.log(`🔗 ${assignedCount} permisos asignados al rol admin`);

  // Verificar asignaciones
  const adminPermissions = await prisma.rolePermission.findMany({
    where: { roleId: adminRole.id },
    include: { permission: true }
  });

  console.log("\n📋 Permisos del rol admin:");
  adminPermissions.forEach(rp => {
    console.log(`   - ${rp.permission.code}: ${rp.permission.description}`);
  });

  console.log(`\n🎉 ¡Todos los permisos han sido añadidos exitosamente!`);
  console.log(`Total de permisos: ${createdPermissions.length}`);
  console.log(`Permisos asignados al admin: ${adminPermissions.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });