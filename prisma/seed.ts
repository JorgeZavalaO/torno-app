/**
 * Seed principal del sistema
 * Crea usuarios admin, permisos y roles básicos
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Configuración del admin (cambiar según necesidades)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@tornoapp.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "Admin123!";

async function main() {
  console.log("🌱 Iniciando seed del sistema...");

  // 1. Crear permisos básicos
  console.log("📝 Creando permisos...");
  const permissions = [
    // Administración
    { code: "roles.read", description: "Ver roles" },
    { code: "roles.write", description: "Crear/editar/eliminar roles" },
    { code: "permissions.read", description: "Ver permisos" },
    { code: "permissions.write", description: "Crear/editar/eliminar permisos" },
    { code: "users.assignRoles", description: "Asignar roles a usuarios" },
    
    // Clientes
    { code: "clients.read", description: "Ver clientes" },
    { code: "clients.write", description: "Crear/editar/eliminar clientes" },
    
    // Configuración
    { code: "settings.costing.read", description: "Ver parámetros de costeo" },
    { code: "settings.costing.write", description: "Editar parámetros de costeo" },
    { code: "settings.catalogos.read", description: "Ver catálogos del sistema" },
    { code: "settings.catalogos.write", description: "Editar catálogos del sistema" },
    
    // Cotizaciones
    { code: "quotes.read", description: "Ver cotizaciones" },
    { code: "quotes.write", description: "Crear/editar/cancelar cotizaciones" },
    
    // Inventario
    { code: "inventory.read", description: "Ver inventario" },
    { code: "inventory.write", description: "Modificar inventario" },
    
    // Compras
    { code: "purchases.read", description: "Ver compras / solicitudes" },
    { code: "purchases.write", description: "Crear/editar compras / solicitudes" },
    
    // Órdenes de trabajo
    { code: "workorders.read", description: "Ver órdenes de trabajo" },
    { code: "workorders.write", description: "Crear/editar órdenes de trabajo" },
    
    // Máquinas
    { code: "machines.read", description: "Ver máquinas" },
    { code: "machines.write", description: "Crear/editar máquinas y eventos" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: p,
      update: { description: p.description },
    });
  }

  // 2. Crear roles
  console.log("👥 Creando roles...");
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    create: { name: "admin", description: "Administrador del sistema con acceso completo" },
    update: { description: "Administrador del sistema con acceso completo" },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: "operator" },
    create: { name: "operator", description: "Operador con permisos de lectura y operación básica" },
    update: { description: "Operador con permisos de lectura y operación básica" },
  });

  // 3. Asignar todos los permisos al rol admin
  console.log("🔐 Asignando permisos al rol admin...");
  const allPerms = await prisma.permission.findMany();
  const permOps = allPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    })
  );
  if (permOps.length > 0) await prisma.$transaction(permOps);

  // 4. Asignar permisos de solo lectura al operador
  console.log("📖 Asignando permisos de lectura al operador...");
  const readOnlyPerms = allPerms.filter(p => p.code.endsWith('.read'));
  const operatorPermOps = readOnlyPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: operatorRole.id, permissionId: perm.id } },
      create: { roleId: operatorRole.id, permissionId: perm.id },
      update: {},
    })
  );
  if (operatorPermOps.length > 0) await prisma.$transaction(operatorPermOps);

  // 5. Crear usuario Auth.js
  console.log(`👤 Creando usuario admin: ${ADMIN_EMAIL}...`);
  const authUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "Administrador",
    },
    update: {
      name: "Administrador",
    },
  });

  // 6. Crear perfil de usuario con hash de contraseña
  const passwordHash = await bcrypt.hash(ADMIN_PASS, 10);
  const userProfile = await prisma.userProfile.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      stackUserId: randomUUID(),
      email: ADMIN_EMAIL,
      displayName: "Administrador del Sistema",
      passwordHash,
      authUserId: authUser.id,
    },
    update: {
      displayName: "Administrador del Sistema",
      passwordHash,
      authUserId: authUser.id,
    },
  });

  // 7. Asignar rol admin al usuario
  console.log("🛡️ Asignando rol admin al usuario...");
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: userProfile.id, roleId: adminRole.id } },
    create: { userId: userProfile.id, roleId: adminRole.id },
    update: {},
  });

  console.log("✅ Seed completado exitosamente!");
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASS}`);
  console.log(`👥 Permisos creados: ${allPerms.length}`);
  console.log(`🎭 Roles creados: admin (todos los permisos), operator (solo lectura)`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
