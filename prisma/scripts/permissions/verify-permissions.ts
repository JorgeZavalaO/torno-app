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
    "roles.read", "roles.write",
    "permissions.read", "permissions.write",
    "users.assignRoles",
    "clients.read", "clients.write",
    "settings.costing.read", "settings.costing.write",
    "quotes.read", "quotes.write",
    "inventory.read", "inventory.write",
    "purchases.read", "purchases.write",
    "workorders.read", "workorders.write",
    "machines.read", "machines.write",
    "production.read", "production.write"
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