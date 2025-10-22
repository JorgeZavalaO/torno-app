/**
 * Seed completo del sistema TornoApp
 * Crea datos de prueba para todas las funcionalidades del sistema
 */
import { PrismaClient, EstadoOT, PrioridadOT, EstadoReclamo, TipoReclamo, TipoResolucion, PrioridadReclamo, EstadoSC, EstadoOC, TipoMovimiento, MaquinaEstado, MaquinaEventoTipo, CategoriaProducto } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Configuración del admin
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@tornoapp.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "Admin123!";

async function main() {
  console.log("🌱 Iniciando seed completo del sistema TornoApp...");

  // 1. Crear permisos básicos
  console.log("📝 Creando permisos...");
  const permissions = [
    // Administración
    { code: "roles.read", description: "Ver roles" },
    { code: "roles.write", description: "Crear/editar/eliminar roles" },
    { code: "permissions.read", description: "Ver permisos" },
    { code: "permissions.write", description: "Crear/editar/eliminar permisos" },
    { code: "users.assignRoles", description: "Asignar roles a usuarios" },

    // Clientes y Reclamos
    { code: "clients.read", description: "Ver clientes" },
    { code: "clients.write", description: "Crear/editar/eliminar clientes" },
    { code: "reclamos.read", description: "Ver reclamos" },
    { code: "reclamos.write", description: "Crear reclamos" },
    { code: "reclamos.approve", description: "Aprobar/rechazar reclamos" },

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

  const comercialRole = await prisma.role.upsert({
    where: { name: "comercial" },
    create: { name: "comercial", description: "Área comercial: gestión de clientes, reclamos y seguimiento de pedidos" },
    update: { description: "Área comercial: gestión de clientes, reclamos y seguimiento de pedidos" },
  });

  const productionRole = await prisma.role.upsert({
    where: { name: "production" },
    create: { name: "production", description: "Área de producción: gestión de OTs, máquinas y partes de producción" },
    update: { description: "Área de producción: gestión de OTs, máquinas y partes de producción" },
  });

  // 3. Asignar permisos a roles
  console.log("🔐 Asignando permisos a roles...");
  const allPerms = await prisma.permission.findMany();

  // Admin: todos los permisos
  const adminPermOps = allPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    })
  );
  await prisma.$transaction(adminPermOps);

  // Operator: solo lectura
  const readOnlyPerms = allPerms.filter(p => p.code.endsWith('.read'));
  const operatorPermOps = readOnlyPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: operatorRole.id, permissionId: perm.id } },
      create: { roleId: operatorRole.id, permissionId: perm.id },
      update: {},
    })
  );
  await prisma.$transaction(operatorPermOps);

  // Comercial: clientes, cotizaciones, reclamos
  const comercialPermCodes = [
    "clients.read", "clients.write",
    "quotes.read", "quotes.write",
    "workorders.read",
    "reclamos.read", "reclamos.write", "reclamos.approve"
  ];
  const comercialPerms = allPerms.filter(p => comercialPermCodes.includes(p.code));
  const comercialPermOps = comercialPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: comercialRole.id, permissionId: perm.id } },
      create: { roleId: comercialRole.id, permissionId: perm.id },
      update: {},
    })
  );
  await prisma.$transaction(comercialPermOps);

  // Producción: OTs, máquinas, inventario
  const productionPermCodes = [
    "workorders.read", "workorders.write",
    "machines.read", "machines.write",
    "inventory.read", "inventory.write",
    "purchases.read"
  ];
  const productionPerms = allPerms.filter(p => productionPermCodes.includes(p.code));
  const productionPermOps = productionPerms.map((perm) =>
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: productionRole.id, permissionId: perm.id } },
      create: { roleId: productionRole.id, permissionId: perm.id },
      update: {},
    })
  );
  await prisma.$transaction(productionPermOps);

  // 4. Crear usuarios
  console.log("👤 Creando usuarios...");

  // Usuario admin
  const adminAuthUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, name: "Administrador" },
    update: { name: "Administrador" },
  });

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASS, 10);
  const adminProfile = await prisma.userProfile.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      stackUserId: randomUUID(),
      email: ADMIN_EMAIL,
      displayName: "Administrador del Sistema",
      passwordHash: adminPasswordHash,
      authUserId: adminAuthUser.id,
    },
    update: {
      displayName: "Administrador del Sistema",
      passwordHash: adminPasswordHash,
      authUserId: adminAuthUser.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminProfile.id, roleId: adminRole.id } },
    create: { userId: adminProfile.id, roleId: adminRole.id },
    update: {},
  });

  // Usuario comercial
  const comercialAuthUser = await prisma.user.upsert({
    where: { email: "comercial@tornoapp.com" },
    create: { email: "comercial@tornoapp.com", name: "María González" },
    update: { name: "María González" },
  });

  const comercialPasswordHash = await bcrypt.hash("Comercial123!", 10);
  const comercialProfile = await prisma.userProfile.upsert({
    where: { email: "comercial@tornoapp.com" },
    create: {
      stackUserId: randomUUID(),
      email: "comercial@tornoapp.com",
      displayName: "María González - Área Comercial",
      passwordHash: comercialPasswordHash,
      authUserId: comercialAuthUser.id,
    },
    update: {
      displayName: "María González - Área Comercial",
      passwordHash: comercialPasswordHash,
      authUserId: comercialAuthUser.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: comercialProfile.id, roleId: comercialRole.id } },
    create: { userId: comercialProfile.id, roleId: comercialRole.id },
    update: {},
  });

  // Usuario producción
  const productionAuthUser = await prisma.user.upsert({
    where: { email: "produccion@tornoapp.com" },
    create: { email: "produccion@tornoapp.com", name: "Carlos Rodríguez" },
    update: { name: "Carlos Rodríguez" },
  });

  const productionPasswordHash = await bcrypt.hash("Produccion123!", 10);
  const productionProfile = await prisma.userProfile.upsert({
    where: { email: "produccion@tornoapp.com" },
    create: {
      stackUserId: randomUUID(),
      email: "produccion@tornoapp.com",
      displayName: "Carlos Rodríguez - Producción",
      passwordHash: productionPasswordHash,
      authUserId: productionAuthUser.id,
    },
    update: {
      displayName: "Carlos Rodríguez - Producción",
      passwordHash: productionPasswordHash,
      authUserId: productionAuthUser.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: productionProfile.id, roleId: productionRole.id } },
    create: { userId: productionProfile.id, roleId: productionRole.id },
    update: {},
  });

  // Usuario operador
  const operatorAuthUser = await prisma.user.upsert({
    where: { email: "operador@tornoapp.com" },
    create: { email: "operador@tornoapp.com", name: "Ana López" },
    update: { name: "Ana López" },
  });

  const operatorPasswordHash = await bcrypt.hash("Operador123!", 10);
  const operatorProfile = await prisma.userProfile.upsert({
    where: { email: "operador@tornoapp.com" },
    create: {
      stackUserId: randomUUID(),
      email: "operador@tornoapp.com",
      displayName: "Ana López - Operador",
      passwordHash: operatorPasswordHash,
      authUserId: operatorAuthUser.id,
    },
    update: {
      displayName: "Ana López - Operador",
      passwordHash: operatorPasswordHash,
      authUserId: operatorAuthUser.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: operatorProfile.id, roleId: operatorRole.id } },
    create: { userId: operatorProfile.id, roleId: operatorRole.id },
    update: {},
  });

  // 5. Crear catálogos básicos
  console.log("📚 Poblando catálogos...");

  // Unidades de medida
  const unidades = [
    { codigo: "PZ", nombre: "Pieza", descripcion: "Unidad por pieza" },
    { codigo: "KG", nombre: "Kilogramo", descripcion: "Unidad por kilogramo" },
    { codigo: "M", nombre: "Metro", descripcion: "Unidad por metro" },
    { codigo: "M2", nombre: "Metro cuadrado", descripcion: "Unidad por metro cuadrado" },
    { codigo: "M3", nombre: "Metro cúbico", descripcion: "Unidad por metro cúbico" },
    { codigo: "L", nombre: "Litro", descripcion: "Unidad por litro" },
    { codigo: "H", nombre: "Hora", descripcion: "Unidad por hora" },
  ];

  for (const unidad of unidades) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "UNIDAD_MEDIDA", codigo: unidad.codigo } },
      create: {
        tipo: "UNIDAD_MEDIDA",
        codigo: unidad.codigo,
        nombre: unidad.nombre,
        descripcion: unidad.descripcion,
        orden: unidades.indexOf(unidad) + 1,
      },
      update: {
        nombre: unidad.nombre,
        descripcion: unidad.descripcion,
        orden: unidades.indexOf(unidad) + 1,
      },
    });
  }

  // Categorías de productos
  const categoriasProducto = [
    { codigo: "MATERIA_PRIMA", nombre: "Materia Prima", descripcion: "Materiales base para fabricación" },
    { codigo: "PIEZA_FABRICADA", nombre: "Pieza Fabricada", descripcion: "Piezas terminadas de fabricación" },
    { codigo: "HERRAMIENTA", nombre: "Herramienta", descripcion: "Herramientas y utillaje" },
    { codigo: "INSUMO", nombre: "Insumo", descripcion: "Insumos diversos" },
    { codigo: "REFACCION", nombre: "Refacción", descripcion: "Refacciones y repuestos" },
  ];

  for (const categoria of categoriasProducto) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "CATEGORIA_PRODUCTO", codigo: categoria.codigo } },
      create: {
        tipo: "CATEGORIA_PRODUCTO",
        codigo: categoria.codigo,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        orden: categoriasProducto.indexOf(categoria) + 1,
      },
      update: {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        orden: categoriasProducto.indexOf(categoria) + 1,
      },
    });
  }

  // Tipos de trabajo
  const tiposTrabajo = [
    { codigo: "FABRICACION", nombre: "Fabricación", descripcion: "Trabajos de fabricación de piezas" },
    { codigo: "TRANSFORMACION", nombre: "Transformación", descripcion: "Trabajos de transformación de materiales" },
    { codigo: "RECTIFICACION", nombre: "Rectificación", descripcion: "Trabajos de rectificación y acabado" },
    { codigo: "SERVICIOS", nombre: "Servicios", descripcion: "Servicios especializados" },
  ];

  for (const tipo of tiposTrabajo) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "TIPO_TRABAJO", codigo: tipo.codigo } },
      create: {
        tipo: "TIPO_TRABAJO",
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        orden: tiposTrabajo.indexOf(tipo) + 1,
      },
      update: {
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        orden: tiposTrabajo.indexOf(tipo) + 1,
      },
    });
  }

  // Estados de OT
  const estadosOT = [
    { codigo: "DRAFT", nombre: "Borrador", descripcion: "OT en estado borrador" },
    { codigo: "OPEN", nombre: "Abierta", descripcion: "OT abierta y pendiente de ejecución" },
    { codigo: "IN_PROGRESS", nombre: "En Progreso", descripcion: "OT en ejecución" },
    { codigo: "DONE", nombre: "Completada", descripcion: "OT completada exitosamente" },
    { codigo: "CANCELLED", nombre: "Cancelada", descripcion: "OT cancelada" },
  ];

  for (const estado of estadosOT) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "ESTADO_OT", codigo: estado.codigo } },
      create: {
        tipo: "ESTADO_OT",
        codigo: estado.codigo,
        nombre: estado.nombre,
        descripcion: estado.descripcion,
        orden: estadosOT.indexOf(estado) + 1,
      },
      update: {
        nombre: estado.nombre,
        descripcion: estado.descripcion,
        orden: estadosOT.indexOf(estado) + 1,
      },
    });
  }

  // 6. Crear clientes
  console.log("🏢 Creando clientes...");
  const clientes = [
    {
      nombre: "Industria Metalúrgica S.A.",
      ruc: "20123456789",
      email: "contacto@metalurgica.com.pe",
      telefono: "+51 1 4567890",
      direccion: "Av. Industrial 123, Lima",
      contactoNombre: "Juan Pérez",
      contactoTelefono: "+51 987654321",
    },
    {
      nombre: "Construcciones del Sur E.I.R.L.",
      ruc: "20567890123",
      email: "ventas@construccionessur.com.pe",
      telefono: "+51 1 5678901",
      direccion: "Calle Los Olivos 456, Arequipa",
      contactoNombre: "María García",
      contactoTelefono: "+51 987654322",
    },
    {
      nombre: "Tecnología Avanzada S.A.C.",
      ruc: "20678901234",
      email: "info@tecnologiaavanzada.com.pe",
      telefono: "+51 1 6789012",
      direccion: "Jr. Tecnología 789, Cusco",
      contactoNombre: "Carlos López",
      contactoTelefono: "+51 987654323",
    },
    {
      nombre: "Manufacturas Industriales Ltda.",
      ruc: "20789012345",
      email: "pedidos@manufacturas.com.pe",
      telefono: "+51 1 7890123",
      direccion: "Av. Manufactura 101, Trujillo",
      contactoNombre: "Ana Rodríguez",
      contactoTelefono: "+51 987654324",
    },
    {
      nombre: "Soluciones Mecánicas S.R.L.",
      ruc: "20890123456",
      email: "contacto@solucionesmecanicas.com.pe",
      telefono: "+51 1 8901234",
      direccion: "Psje. Mecánico 202, Chiclayo",
      contactoNombre: "Pedro Martínez",
      contactoTelefono: "+51 987654325",
    },
  ];

  const clientesCreados = [];
  for (const cliente of clientes) {
    const clienteCreado = await prisma.cliente.create({ data: cliente });
    clientesCreados.push(clienteCreado);
  }

  // 7. Crear productos
  console.log("📦 Creando productos...");
  const productos = [
    {
      sku: "MAT-001",
      nombre: "Acero Inoxidable 304",
      categoria: "MATERIA_PRIMA" as CategoriaProducto,
      uom: "KG",
      costo: 25.50,
      stockMinimo: 100.0,
    },
    {
      sku: "MAT-002",
      nombre: "Aluminio 6061",
      categoria: "MATERIA_PRIMA" as CategoriaProducto,
      uom: "KG",
      costo: 18.75,
      stockMinimo: 50.0,
    },
    {
      sku: "HERR-001",
      nombre: "Broca HSS 10mm",
      categoria: "HERRAMIENTA_CORTE" as CategoriaProducto,
      uom: "PZ",
      costo: 45.00,
      stockMinimo: 5.0,
    },
    {
      sku: "HERR-002",
      nombre: "Fresa Carburo 20mm",
      categoria: "HERRAMIENTA_CORTE" as CategoriaProducto,
      uom: "PZ",
      costo: 120.00,
      stockMinimo: 3.0,
    },
    {
      sku: "PIEZA-001",
      nombre: "Eje de Transmisión Ø50mm",
      categoria: "FABRICACION" as CategoriaProducto,
      uom: "PZ",
      costo: 85.00,
      stockMinimo: 10.0,
    },
    {
      sku: "PIEZA-002",
      nombre: "Rodamiento de Bolas 6205",
      categoria: "REPUESTO" as CategoriaProducto,
      uom: "PZ",
      costo: 15.50,
      stockMinimo: 20.0,
    },
    {
      sku: "INS-001",
      nombre: "Aceite de Corte Sintético",
      categoria: "CONSUMIBLE" as CategoriaProducto,
      uom: "L",
      costo: 35.00,
      stockMinimo: 10.0,
    },
  ];

  const productosCreados = [];
  for (const producto of productos) {
    const productoCreado = await prisma.producto.create({ data: producto });
    productosCreados.push(productoCreado);
  }

  // 8. Crear movimientos de inventario iniciales
  console.log("📊 Creando movimientos de inventario...");
  const movimientosIniciales = [
    { productoId: "MAT-001", tipo: "INGRESO_COMPRA" as TipoMovimiento, cantidad: 500, costoUnitario: 25.50, nota: "Compra inicial" },
    { productoId: "MAT-002", tipo: "INGRESO_COMPRA" as TipoMovimiento, cantidad: 200, costoUnitario: 18.75, nota: "Compra inicial" },
    { productoId: "HERR-001", tipo: "INGRESO_COMPRA" as TipoMovimiento, cantidad: 20, costoUnitario: 45.00, nota: "Compra inicial" },
    { productoId: "HERR-002", tipo: "INGRESO_COMPRA" as TipoMovimiento, cantidad: 10, costoUnitario: 120.00, nota: "Compra inicial" },
    { productoId: "PIEZA-001", tipo: "INGRESO_AJUSTE" as TipoMovimiento, cantidad: 50, costoUnitario: 85.00, nota: "Inventario inicial" },
    { productoId: "PIEZA-002", tipo: "INGRESO_COMPRA" as TipoMovimiento, cantidad: 100, costoUnitario: 15.50, nota: "Compra inicial" },
    { productoId: "INS-001", tipo: "INGRESO_COMPRA" as TipoMovimiento, cantidad: 50, costoUnitario: 35.00, nota: "Compra inicial" },
  ];

  for (const movimiento of movimientosIniciales) {
    await prisma.movimiento.create({ data: movimiento });
  }

  // 9. Crear proveedores
  console.log("🏭 Creando proveedores...");
  const proveedores = [
    {
      nombre: "Suministros Industriales S.A.",
      ruc: "20111222333",
      contacto: "Roberto Silva",
      email: "ventas@suministrosindustriales.com.pe",
      telefono: "+51 1 4455667",
      direccion: "Av. Suministros 456, Lima",
    },
    {
      nombre: "Herramientas Especializadas Ltda.",
      ruc: "20444555666",
      contacto: "Patricia Morales",
      email: "info@herramientasespecializadas.com.pe",
      telefono: "+51 1 7788990",
      direccion: "Calle Herramientas 789, Arequipa",
    },
  ];

  const proveedoresCreados = [];
  for (const proveedor of proveedores) {
    const proveedorCreado = await prisma.proveedor.create({ data: proveedor });
    proveedoresCreados.push(proveedorCreado);
  }

  // 10. Crear máquinas
  console.log("⚙️ Creando máquinas...");
  const maquinas = [
    {
      codigo: "TORNO-001",
      nombre: "Torno CNC Mazak",
      categoria: "TORNO",
      estado: "ACTIVA" as MaquinaEstado,
      ubicacion: "Taller Principal",
      fabricante: "Mazak",
      modelo: "QT-250",
      capacidad: "Ø250mm x 1000mm",
      notas: "Torno CNC de alta precisión",
    },
    {
      codigo: "FRESA-001",
      nombre: "Fresadora Vertical",
      categoria: "FRESADORA",
      estado: "ACTIVA" as MaquinaEstado,
      ubicacion: "Taller Principal",
      fabricante: "Haas",
      modelo: "VF-2",
      capacidad: "1000x500x600mm",
      notas: "Fresadora vertical CNC",
    },
    {
      codigo: "TORNO-002",
      nombre: "Torno Convencional",
      categoria: "TORNO",
      estado: "MANTENIMIENTO" as MaquinaEstado,
      ubicacion: "Taller Secundario",
      fabricante: "Emco",
      modelo: "Concept Turn 55",
      capacidad: "Ø200mm x 500mm",
      notas: "Torno convencional - En mantenimiento preventivo",
    },
  ];

  const maquinasCreadas = [];
  for (const maquina of maquinas) {
    const maquinaCreada = await prisma.maquina.create({ data: maquina });
    maquinasCreadas.push(maquinaCreada);
  }

  // 11. Crear órdenes de trabajo
  console.log("📋 Creando órdenes de trabajo...");
  const ots = [
    {
      codigo: "OT-2025-001",
      estado: "DONE" as EstadoOT,
      prioridad: "HIGH" as PrioridadOT,
      clienteId: clientesCreados[0].id,
      notas: "Ejes de transmisión para línea de producción",
      acabado: "Rectificado",
      fechaLimite: new Date("2025-11-15"),
      costQuoteMaterials: 1250.00,
      costQuoteLabor: 850.00,
      costQuoteOverheads: 275.00,
      costQuoteTotal: 2375.00,
      costMaterials: 1200.00,
      costLabor: 820.00,
      costOverheads: 250.00,
      costTotal: 2270.00,
    },
    {
      codigo: "OT-2025-002",
      estado: "IN_PROGRESS" as EstadoOT,
      prioridad: "MEDIUM" as PrioridadOT,
      clienteId: clientesCreados[1].id,
      notas: "Piezas para estructura metálica",
      acabado: "Pintado",
      fechaLimite: new Date("2025-12-01"),
      costQuoteMaterials: 2100.00,
      costQuoteLabor: 1200.00,
      costQuoteOverheads: 420.00,
      costQuoteTotal: 3720.00,
      costMaterials: 1950.00,
      costLabor: 950.00,
      costOverheads: 320.00,
      costTotal: 3220.00,
    },
    {
      codigo: "OT-2025-003",
      estado: "OPEN" as EstadoOT,
      prioridad: "URGENT" as PrioridadOT,
      clienteId: clientesCreados[2].id,
      notas: "Reparación urgente de componentes",
      acabado: "Ninguno",
      fechaLimite: new Date("2025-10-25"),
      costQuoteMaterials: 450.00,
      costQuoteLabor: 320.00,
      costQuoteOverheads: 85.00,
      costQuoteTotal: 855.00,
    },
    {
      codigo: "OT-2025-004",
      estado: "DRAFT" as EstadoOT,
      prioridad: "LOW" as PrioridadOT,
      clienteId: clientesCreados[3].id,
      notas: "Prototipo de nueva pieza",
      acabado: "Acabado fino",
    },
    {
      codigo: "OT-2025-005",
      estado: "CANCELLED" as EstadoOT,
      prioridad: "MEDIUM" as PrioridadOT,
      clienteId: clientesCreados[4].id,
      notas: "Proyecto cancelado por cliente",
      acabado: "Ninguno",
    },
  ];

  const otsCreadas = [];
  for (const ot of ots) {
    const otCreada = await prisma.ordenTrabajo.create({ data: ot });
    otsCreadas.push(otCreada);
  }

  // 12. Crear piezas y materiales para OTs
  console.log("🔧 Creando piezas y materiales para OTs...");

  // OT-2025-001: Ejes de transmisión
  await prisma.oTPieza.create({
    data: {
      otId: otsCreadas[0].id,
      productoId: "PIEZA-001",
      descripcion: "Eje de transmisión Ø50mm x 300mm",
      qtyPlan: 25,
      qtyHecha: 25,
    },
  });

  await prisma.oTMaterial.create({
    data: {
      otId: otsCreadas[0].id,
      productoId: "MAT-001",
      qtyPlan: 125,
      qtyEmit: 120,
    },
  });

  // OT-2025-002: Piezas para estructura
  await prisma.oTPieza.create({
    data: {
      otId: otsCreadas[1].id,
      descripcion: "Viga estructural L100x100x10mm",
      qtyPlan: 50,
      qtyHecha: 35,
    },
  });

  await prisma.oTMaterial.create({
    data: {
      otId: otsCreadas[1].id,
      productoId: "MAT-002",
      qtyPlan: 250,
      qtyEmit: 180,
    },
  });

  // 13. Crear partes de producción
  console.log("🏭 Creando partes de producción...");
  const partesProduccion = [
    {
      otId: otsCreadas[0].id,
      userId: productionProfile.id,
      horas: 8.5,
      maquina: "TORNO-001",
      nota: "Fabricación de ejes de transmisión",
      qtyBuenas: 25,
      qtyScrap: 0,
      fecha: new Date("2025-10-15"),
    },
    {
      otId: otsCreadas[1].id,
      userId: productionProfile.id,
      horas: 6.0,
      maquina: "FRESA-001",
      nota: "Corte de vigas estructurales",
      qtyBuenas: 20,
      qtyScrap: 1,
      motivoScrap: "Defecto de material",
      fecha: new Date("2025-10-20"),
    },
  ];

  for (const parte of partesProduccion) {
    await prisma.parteProduccion.create({ data: parte });
  }

  // 14. Crear eventos de máquina
  console.log("📅 Creando eventos de máquina...");
  const eventosMaquina = [
    {
      maquinaId: maquinasCreadas[0].id,
      tipo: "USO" as MaquinaEventoTipo,
      inicio: new Date("2025-10-15T08:00:00"),
      fin: new Date("2025-10-15T16:30:00"),
      horas: 8.5,
      nota: "Fabricación OT-2025-001",
      otId: otsCreadas[0].id,
      userId: productionProfile.id,
    },
    {
      maquinaId: maquinasCreadas[1].id,
      tipo: "USO" as MaquinaEventoTipo,
      inicio: new Date("2025-10-20T09:00:00"),
      fin: new Date("2025-10-20T15:00:00"),
      horas: 6.0,
      nota: "Fabricación OT-2025-002",
      otId: otsCreadas[1].id,
      userId: productionProfile.id,
    },
    {
      maquinaId: maquinasCreadas[2].id,
      tipo: "MANTENIMIENTO" as MaquinaEventoTipo,
      inicio: new Date("2025-10-18T08:00:00"),
      fin: new Date("2025-10-18T12:00:00"),
      horas: 4.0,
      nota: "Mantenimiento preventivo programado",
    },
  ];

  for (const evento of eventosMaquina) {
    await prisma.maquinaEvento.create({ data: evento });
  }

  // 15. Crear cotizaciones
  console.log("💰 Creando cotizaciones...");
  const cotizaciones = [
    {
      clienteId: clientesCreados[0].id,
      currency: "PEN",
      giPct: 0.15,
      marginPct: 0.20,
      hourlyRate: 25.00,
      kwhRate: 0.80,
      deprPerHour: 5.00,
      toolingPerPc: 2.50,
      rentPerHour: 3.00,
      qty: 25,
      materials: 1250.00,
      hours: 50.0,
      costDirect: 2125.00,
      giAmount: 318.75,
      subtotal: 2443.75,
      marginAmount: 488.75,
      total: 2932.50,
      unitPrice: 117.30,
      breakdown: { materials: 1250.00, labor: 1250.00, overheads: 432.50 },
      status: "APPROVED" as const,
      notes: "Cotización para ejes de transmisión",
    },
    {
      clienteId: clientesCreados[1].id,
      currency: "PEN",
      giPct: 0.15,
      marginPct: 0.20,
      hourlyRate: 30.00,
      kwhRate: 0.90,
      deprPerHour: 8.00,
      toolingPerPc: 5.00,
      rentPerHour: 4.00,
      qty: 50,
      materials: 2100.00,
      hours: 80.0,
      costDirect: 3300.00,
      giAmount: 495.00,
      subtotal: 3795.00,
      marginAmount: 759.00,
      total: 4554.00,
      unitPrice: 91.08,
      breakdown: { materials: 2100.00, labor: 2400.00, overheads: 720.00 },
      status: "APPROVED" as const,
      notes: "Cotización para vigas estructurales",
    },
  ];

  const cotizacionesCreadas = [];
  for (const cotizacion of cotizaciones) {
    const cotizacionCreada = await prisma.cotizacion.create({ data: cotizacion });
    cotizacionesCreadas.push(cotizacionCreada);
  }

  // Vincular OTs a cotizaciones
  await prisma.ordenTrabajo.update({
    where: { id: otsCreadas[0].id },
    data: { cotizacionId: cotizacionesCreadas[0].id },
  });

  await prisma.ordenTrabajo.update({
    where: { id: otsCreadas[1].id },
    data: { cotizacionId: cotizacionesCreadas[1].id },
  });

  // 16. Crear solicitudes de compra
  console.log("📝 Creando solicitudes de compra...");
  const scs = [
    {
      solicitanteId: productionProfile.id,
      otId: otsCreadas[1].id,
      estado: "APPROVED" as EstadoSC,
      totalEstimado: 4500.00,
      notas: "Materiales para OT-2025-002",
    },
    {
      solicitanteId: productionProfile.id,
      estado: "PENDING_ADMIN" as EstadoSC,
      totalEstimado: 1200.00,
      notas: "Herramientas adicionales",
    },
  ];

  const scsCreadas = [];
  for (const sc of scs) {
    const scCreada = await prisma.solicitudCompra.create({ data: sc });
    scsCreadas.push(scCreada);
  }

  // Crear items de SC
  await prisma.sCItem.create({
    data: {
      scId: scsCreadas[0].id,
      productoId: "MAT-002",
      cantidad: 100,
      costoEstimado: 1875.00,
    },
  });

  await prisma.sCItem.create({
    data: {
      scId: scsCreadas[1].id,
      productoId: "HERR-002",
      cantidad: 5,
      costoEstimado: 600.00,
    },
  });

  // 17. Crear órdenes de compra
  console.log("🛒 Creando órdenes de compra...");
  const ocs = [
    {
      scId: scsCreadas[0].id,
      proveedorId: proveedoresCreados[0].id,
      codigo: "OC-2025-001",
      estado: "RECEIVED" as EstadoOC,
      total: 4320.00,
      fecha: new Date("2025-10-10"),
    },
    {
      scId: scsCreadas[1].id,
      proveedorId: proveedoresCreados[1].id,
      codigo: "OC-2025-002",
      estado: "OPEN" as EstadoOC,
      total: 1150.00,
      fecha: new Date("2025-10-22"),
    },
  ];

  const ocsCreadas = [];
  for (const oc of ocs) {
    const ocCreada = await prisma.ordenCompra.create({ data: oc });
    ocsCreadas.push(ocCreada);
  }

  // Crear items de OC
  await prisma.oCItem.create({
    data: {
      ocId: ocsCreadas[0].id,
      productoId: "MAT-002",
      cantidad: 95,
      costoUnitario: 18.50,
      scItemId: (await prisma.sCItem.findFirst({ where: { scId: scsCreadas[0].id } }))!.id,
    },
  });

  await prisma.oCItem.create({
    data: {
      ocId: ocsCreadas[1].id,
      productoId: "HERR-002",
      cantidad: 5,
      costoUnitario: 230.00,
      scItemId: (await prisma.sCItem.findFirst({ where: { scId: scsCreadas[1].id } }))!.id,
    },
  });

  // 18. Crear reclamos
  console.log("📞 Creando reclamos...");
  const reclamos = [
    {
      clienteId: clientesCreados[0].id,
      titulo: "Defecto en acabado de ejes",
      descripcion: "Los ejes entregados presentan rugosidad superior a la especificada en la cotización. Se requiere rectificación.",
      prioridad: "ALTA" as PrioridadReclamo,
      estado: "APPROVED" as EstadoReclamo,
      categoria: "Calidad",
      tipoReclamo: "OT_ATENDIDA" as TipoReclamo,
      otReferenciaId: otsCreadas[0].id,
      tipoResolucion: "OT_PENDIENTE" as TipoResolucion,
    },
    {
      clienteId: clientesCreados[1].id,
      titulo: "Demora en entrega",
      descripcion: "La entrega se realizó con 5 días de retraso respecto a la fecha acordada.",
      prioridad: "MEDIA" as PrioridadReclamo,
      estado: "UNDER_REVIEW" as EstadoReclamo,
      categoria: "Entrega",
      tipoReclamo: "OT_ATENDIDA" as TipoReclamo,
      otReferenciaId: otsCreadas[1].id,
    },
    {
      clienteId: clientesCreados[2].id,
      titulo: "Solicitud de modificación de diseño",
      descripcion: "Se requiere modificar las especificaciones de las piezas para adaptarlas a nuevos requerimientos.",
      prioridad: "MEDIA" as PrioridadReclamo,
      estado: "PENDING" as EstadoReclamo,
      categoria: "Diseño",
      tipoReclamo: "NUEVO_RECLAMO" as TipoReclamo,
    },
    {
      clienteId: clientesCreados[3].id,
      titulo: "Reclamo por precio",
      descripcion: "El precio final fue superior al cotizado inicialmente.",
      prioridad: "BAJA" as PrioridadReclamo,
      estado: "REJECTED" as EstadoReclamo,
      categoria: "Precio",
      tipoReclamo: "NUEVO_RECLAMO" as TipoReclamo,
    },
    {
      clienteId: clientesCreados[4].id,
      titulo: "Piezas faltantes en entrega",
      descripcion: "Faltaron 3 piezas del total ordenado.",
      prioridad: "URGENTE" as PrioridadReclamo,
      estado: "APPROVED" as EstadoReclamo,
      categoria: "Entrega",
      tipoReclamo: "OT_ATENDIDA" as TipoReclamo,
      otReferenciaId: otsCreadas[1].id,
      tipoResolucion: "AJUSTE_STOCK" as TipoResolucion,
    },
  ];

  const reclamosCreados = [];
  for (const reclamo of reclamos) {
    const reclamoCreado = await prisma.reclamo.create({ data: reclamo });
    reclamosCreados.push(reclamoCreado);
  }

  console.log("✅ Seed completo creado exitosamente!");
  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMEN DE DATOS DE PRUEBA");
  console.log("=".repeat(50));
  console.log(`👥 Usuarios creados: 4`);
  console.log(`   - Admin: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
  console.log(`   - Comercial: comercial@tornoapp.com / Comercial123!`);
  console.log(`   - Producción: produccion@tornoapp.com / Produccion123!`);
  console.log(`   - Operador: operador@tornoapp.com / Operador123!`);
  console.log(`🏢 Clientes creados: ${clientesCreados.length}`);
  console.log(`📦 Productos creados: ${productosCreados.length}`);
  console.log(`⚙️ Máquinas creadas: ${maquinasCreadas.length}`);
  console.log(`📋 Órdenes de trabajo: ${otsCreadas.length}`);
  console.log(`💰 Cotizaciones: ${cotizacionesCreadas.length}`);
  console.log(`📝 Solicitudes de compra: ${scsCreadas.length}`);
  console.log(`🛒 Órdenes de compra: ${ocsCreadas.length}`);
  console.log(`📞 Reclamos: ${reclamosCreados.length}`);
  console.log(`📊 Movimientos de inventario: ${movimientosIniciales.length}`);
  console.log(`🏭 Partes de producción: ${partesProduccion.length}`);
  console.log(`📅 Eventos de máquina: ${eventosMaquina.length}`);
  console.log("\n📄 Documentación completa en: docs/test-data.md");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
