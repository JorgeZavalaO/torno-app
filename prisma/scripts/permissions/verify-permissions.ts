import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verificando configuración de permisos...\n");

  // Verificar permisos existentes
  const permissions = await prisma.permission.findMany({
    orderBy: { code: 'asc' }
  });

  console.log(`📋 Total de permisos en el sistema: ${permissions.length}`);
  permissions.forEach(p => {
    console.log(`   - ${p.code}: ${p.description}`);
  });

  // Verificar rol admin
  const adminRole = await prisma.role.findFirst({
    where: { name: "admin" },
    include: {
      permissions: {
        include: { permission: true },
        orderBy: { permission: { code: 'asc' } }
      }
    }
  });

  if (!adminRole) {
    console.log("❌ Rol 'admin' no encontrado");
    return;
  }

  console.log(`\n👑 Rol admin encontrado: ${adminRole.name}`);
  console.log(`📋 Permisos asignados al rol admin: ${adminRole.permissions.length}`);

  adminRole.permissions.forEach(rp => {
    console.log(`   ✓ ${rp.permission.code}: ${rp.permission.description}`);
  });

  // Verificar que todos los permisos del guards.ts están incluidos
  const guardsPermissions = [
    // Roles y permisos
    "roles.read", "roles.write",
    "permissions.read", "permissions.write",
    // Usuarios
    "users.assignRoles",
    // Clientes
    "clients.read", "clients.write",
    // Configuración de costos y catálogos
    "settings.costing.read", "settings.costing.write",
    "settings.catalogos.read", "settings.catalogos.write",
    // Cotizaciones
    "quotes.read", "quotes.write",
    // Inventario
    "inventory.read", "inventory.write",
    // Compras
    "purchases.read", "purchases.write",
    // Órdenes de trabajo
    "workorders.read", "workorders.write",
    // Máquinas
    "machines.read", "machines.write",
    // Producción
    "production.read", "production.write",
    // Reclamos
    "reclamos.read", "reclamos.write", "reclamos.approve",
  ];

  const adminPermissionCodes = adminRole.permissions.map(rp => rp.permission.code);
  const missingPermissions = guardsPermissions.filter(p => !adminPermissionCodes.includes(p));

  if (missingPermissions.length === 0) {
    console.log("\n✅ ¡Todos los permisos requeridos están correctamente configurados!");
  } else {
    console.log("\n⚠️  Permisos faltantes:");
    missingPermissions.forEach(p => console.log(`   - ${p}`));
  }

  // Verificar usuarios con rol admin
  const adminUsers = await prisma.userRole.findMany({
    where: { roleId: adminRole.id },
    include: { user: true }
  });

  console.log(`\n👥 Usuarios con rol admin: ${adminUsers.length}`);
  adminUsers.forEach(ur => {
    console.log(`   - ${ur.user.email}`);
  });

  console.log("\n🎯 Verificación completada");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });