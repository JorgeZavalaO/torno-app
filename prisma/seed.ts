/**
 * Seed minimalista: solo configuración de catálogos.
 * Se eliminan todos los datos de prueba. Útil para pruebas manuales.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de configuración de catálogos...");

  // 1) Unidades de medida
  const unidades = [
    { codigo: "PZ", nombre: "Pieza", descripcion: "Unidad por pieza" },
    { codigo: "KG", nombre: "Kilogramo", descripcion: "Unidad por kilogramo" },
    { codigo: "M", nombre: "Metro", descripcion: "Unidad por metro" },
    { codigo: "M2", nombre: "Metro cuadrado", descripcion: "Unidad por metro cuadrado" },
    { codigo: "M3", nombre: "Metro cúbico", descripcion: "Unidad por metro cúbico" },
    { codigo: "L", nombre: "Litro", descripcion: "Unidad por litro" },
    { codigo: "H", nombre: "Hora", descripcion: "Unidad por hora" },
  ];

  for (const [i, unidad] of unidades.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "UNIDAD_MEDIDA", codigo: unidad.codigo } },
      create: { tipo: "UNIDAD_MEDIDA", codigo: unidad.codigo, nombre: unidad.nombre, descripcion: unidad.descripcion, orden: i + 1 },
      update: { nombre: unidad.nombre, descripcion: unidad.descripcion, orden: i + 1 },
    });
  }

  // 2) Categorías de productos
  const categoriasProducto = [
    { codigo: "MATERIA_PRIMA", nombre: "Materia Prima", descripcion: "Materiales base para fabricación" },
    { codigo: "HERRAMIENTA_CORTE", nombre: "Herramienta de Corte", descripcion: "Herramientas y utillaje de corte" },
    { codigo: "CONSUMIBLE", nombre: "Consumible", descripcion: "Insumos y consumibles" },
    { codigo: "REPUESTO", nombre: "Repuesto", descripcion: "Refacciones y repuestos" },
    { codigo: "FABRICACION", nombre: "Fabricación", descripcion: "Piezas fabricadas" },
  ];

  for (const [i, categoria] of categoriasProducto.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "CATEGORIA_PRODUCTO", codigo: categoria.codigo } },
      create: { tipo: "CATEGORIA_PRODUCTO", codigo: categoria.codigo, nombre: categoria.nombre, descripcion: categoria.descripcion, orden: i + 1 },
      update: { nombre: categoria.nombre, descripcion: categoria.descripcion, orden: i + 1 },
    });
  }

  // 3) Tipos de movimiento de inventario
  const tiposMovimiento = [
    { codigo: "INGRESO_COMPRA", nombre: "Ingreso por compra" },
    { codigo: "INGRESO_AJUSTE", nombre: "Ingreso por ajuste" },
    { codigo: "SALIDA_AJUSTE", nombre: "Salida por ajuste" },
    { codigo: "SALIDA_OT", nombre: "Salida por OT" },
    { codigo: "INGRESO_OT", nombre: "Ingreso por OT" },
  ];
  for (const [i, tm] of tiposMovimiento.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "TIPO_MOVIMIENTO", codigo: tm.codigo } },
      create: { tipo: "TIPO_MOVIMIENTO", codigo: tm.codigo, nombre: tm.nombre, orden: i + 1 },
      update: { nombre: tm.nombre, orden: i + 1 },
    });
  }

  // 4) Tipos de trabajo y subcategorías de servicios
  const tiposTrabajo = [
    { codigo: "FABRICACION", nombre: "Fabricación", descripcion: "Trabajos de fabricación de piezas" },
    { codigo: "TRANSFORMACION", nombre: "Transformación", descripcion: "Transformación de materiales" },
    { codigo: "RECTIFICACION", nombre: "Rectificación", descripcion: "Rectificado y acabado" },
    { codigo: "SERVICIOS", nombre: "Servicios", descripcion: "Servicios especializados" },
    // Subcategorías de servicios (propiedades.parent = SERVICIOS)
    { codigo: "SERVICIO_SOLDADURA_AUTOGENA", nombre: "Soldadura Autógena", descripcion: "Servicio de soldadura autógena", propiedades: { parent: "SERVICIOS", isSubcategory: true } },
    { codigo: "SERVICIO_SOLDADURA_TIG", nombre: "Soldadura TIG", descripcion: "Servicio de soldadura TIG", propiedades: { parent: "SERVICIOS", isSubcategory: true } },
    { codigo: "SERVICIO_PROTECTORES_METALICOS", nombre: "Protectores Metálicos", descripcion: "Fabricación de protectores metálicos", propiedades: { parent: "SERVICIOS", isSubcategory: true } },
  ];
  for (const [i, t] of tiposTrabajo.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "TIPO_TRABAJO", codigo: t.codigo } },
      create: { tipo: "TIPO_TRABAJO", codigo: t.codigo, nombre: t.nombre, descripcion: t.descripcion, orden: i + 1, propiedades: t.propiedades, activo: true },
      update: { nombre: t.nombre, descripcion: t.descripcion, orden: i + 1, propiedades: t.propiedades, activo: true },
    });
  }

  // 5) Estados y prioridades de OT
  const estadosOT = [
    { codigo: "DRAFT", nombre: "Borrador" },
    { codigo: "OPEN", nombre: "Abierta" },
    { codigo: "IN_PROGRESS", nombre: "En Progreso" },
    { codigo: "DONE", nombre: "Completada" },
    { codigo: "CANCELLED", nombre: "Cancelada" },
  ];
  for (const [i, e] of estadosOT.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "ESTADO_OT", codigo: e.codigo } },
      create: { tipo: "ESTADO_OT", codigo: e.codigo, nombre: e.nombre, orden: i + 1 },
      update: { nombre: e.nombre, orden: i + 1 },
    });
  }

  const prioridadesOT = [
    { codigo: "LOW", nombre: "Baja" },
    { codigo: "MEDIUM", nombre: "Media" },
    { codigo: "HIGH", nombre: "Alta" },
    { codigo: "URGENT", nombre: "Urgente" },
  ];
  for (const [i, p] of prioridadesOT.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "PRIORIDAD_OT", codigo: p.codigo } },
      create: { tipo: "PRIORIDAD_OT", codigo: p.codigo, nombre: p.nombre, orden: i + 1 },
      update: { nombre: p.nombre, orden: i + 1 },
    });
  }

  // 6) Catálogos de máquinas y mantenimiento
  const estadosMaquina = [
    { codigo: "ACTIVA", nombre: "Activa" },
    { codigo: "MANTENIMIENTO", nombre: "Mantenimiento" },
    { codigo: "BAJA", nombre: "Baja" },
  ];
  for (const [i, em] of estadosMaquina.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "ESTADO_MAQUINA", codigo: em.codigo } },
      create: { tipo: "ESTADO_MAQUINA", codigo: em.codigo, nombre: em.nombre, orden: i + 1 },
      update: { nombre: em.nombre, orden: i + 1 },
    });
  }

  const eventosMaquina = [
    { codigo: "USO", nombre: "Uso" },
    { codigo: "PARO", nombre: "Paro" },
    { codigo: "MANTENIMIENTO", nombre: "Mantenimiento" },
    { codigo: "AVERIA", nombre: "Avería" },
    { codigo: "DISPONIBLE", nombre: "Disponible" },
  ];
  for (const [i, ev] of eventosMaquina.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "EVENTO_MAQUINA", codigo: ev.codigo } },
      create: { tipo: "EVENTO_MAQUINA", codigo: ev.codigo, nombre: ev.nombre, orden: i + 1 },
      update: { nombre: ev.nombre, orden: i + 1 },
    });
  }

  const categoriasMaquina = [
    { codigo: "TORNO", nombre: "Torno" },
    { codigo: "FRESADORA", nombre: "Fresadora" },
    { codigo: "TALADRO", nombre: "Taladro" },
    { codigo: "CIZALLA", nombre: "Cizalla" },
  ];
  for (const [i, cm] of categoriasMaquina.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "CATEGORIA_MAQUINA", codigo: cm.codigo } },
      create: { tipo: "CATEGORIA_MAQUINA", codigo: cm.codigo, nombre: cm.nombre, orden: i + 1 },
      update: { nombre: cm.nombre, orden: i + 1 },
    });
  }

  const tiposMantenimiento = [
    { codigo: "PREVENTIVO", nombre: "Preventivo" },
    { codigo: "CORRECTIVO", nombre: "Correctivo" },
    { codigo: "CALIBRACION", nombre: "Calibración" },
  ];
  for (const [i, tmto] of tiposMantenimiento.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "TIPO_MANTENIMIENTO", codigo: tmto.codigo } },
      create: { tipo: "TIPO_MANTENIMIENTO", codigo: tmto.codigo, nombre: tmto.nombre, orden: i + 1 },
      update: { nombre: tmto.nombre, orden: i + 1 },
    });
  }

  const estadosMantenimiento = [
    { codigo: "PENDIENTE", nombre: "Pendiente" },
    { codigo: "EN_PROCESO", nombre: "En proceso" },
    { codigo: "COMPLETADO", nombre: "Completado" },
  ];
  for (const [i, est] of estadosMantenimiento.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "ESTADO_MANTENIMIENTO", codigo: est.codigo } },
      create: { tipo: "ESTADO_MANTENIMIENTO", codigo: est.codigo, nombre: est.nombre, orden: i + 1 },
      update: { nombre: est.nombre, orden: i + 1 },
    });
  }

  // 7) Compras: estados de SC/OC
  const estadosSC = [
    { codigo: "PENDING_ADMIN", nombre: "Pendiente Admin" },
    { codigo: "PENDING_GERENCIA", nombre: "Pendiente Gerencia" },
    { codigo: "APPROVED", nombre: "Aprobada" },
    { codigo: "REJECTED", nombre: "Rechazada" },
    { codigo: "CANCELLED", nombre: "Cancelada" },
  ];
  for (const [i, est] of estadosSC.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "ESTADO_SC", codigo: est.codigo } },
      create: { tipo: "ESTADO_SC", codigo: est.codigo, nombre: est.nombre, orden: i + 1 },
      update: { nombre: est.nombre, orden: i + 1 },
    });
  }

  const estadosOC = [
    { codigo: "OPEN", nombre: "Abierta" },
    { codigo: "PARTIAL", nombre: "Parcial" },
    { codigo: "RECEIVED", nombre: "Recibida" },
    { codigo: "CLOSED", nombre: "Cerrada" },
    { codigo: "CANCELLED", nombre: "Cancelada" },
  ];
  for (const [i, est] of estadosOC.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "ESTADO_OC", codigo: est.codigo } },
      create: { tipo: "ESTADO_OC", codigo: est.codigo, nombre: est.nombre, orden: i + 1 },
      update: { nombre: est.nombre, orden: i + 1 },
    });
  }

  // 8) Cotizaciones: estado, moneda y tipo de parámetro
  const estadosCotizacion = [
    { codigo: "DRAFT", nombre: "Borrador" },
    { codigo: "SENT", nombre: "Enviada" },
    { codigo: "APPROVED", nombre: "Aprobada" },
    { codigo: "REJECTED", nombre: "Rechazada" },
  ];
  for (const [i, est] of estadosCotizacion.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "ESTADO_COTIZACION", codigo: est.codigo } },
      create: { tipo: "ESTADO_COTIZACION", codigo: est.codigo, nombre: est.nombre, orden: i + 1 },
      update: { nombre: est.nombre, orden: i + 1 },
    });
  }

  const monedas = [
    { codigo: "PEN", nombre: "Sol (PEN)" },
    { codigo: "USD", nombre: "Dólar (USD)" },
    { codigo: "EUR", nombre: "Euro (EUR)" },
  ];
  for (const [i, m] of monedas.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "MONEDA", codigo: m.codigo } },
      create: { tipo: "MONEDA", codigo: m.codigo, nombre: m.nombre, orden: i + 1 },
      update: { nombre: m.nombre, orden: i + 1 },
    });
  }

  const tiposParametro = [
    { codigo: "NUMBER", nombre: "Número" },
    { codigo: "PERCENT", nombre: "% Porcentaje" },
    { codigo: "CURRENCY", nombre: "Moneda" },
    { codigo: "TEXT", nombre: "Texto" },
  ];
  for (const [i, tp] of tiposParametro.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "TIPO_PARAMETRO", codigo: tp.codigo } },
      create: { tipo: "TIPO_PARAMETRO", codigo: tp.codigo, nombre: tp.nombre, orden: i + 1 },
      update: { nombre: tp.nombre, orden: i + 1 },
    });
  }

  // 9) Tipos de acabado de piezas (para UI)
  const tiposAcabado = [
    { codigo: "NINGUNO", nombre: "Ninguno" },
    { codigo: "PINTADO", nombre: "Pintado" },
    { codigo: "CROMADO", nombre: "Cromado" },
    { codigo: "RECTIFICADO", nombre: "Rectificado" },
  ];
  for (const [i, a] of tiposAcabado.entries()) {
    await prisma.configuracionCatalogo.upsert({
      where: { tipo_codigo: { tipo: "TIPO_ACABADO", codigo: a.codigo } },
      create: { tipo: "TIPO_ACABADO", codigo: a.codigo, nombre: a.nombre, orden: i + 1 },
      update: { nombre: a.nombre, orden: i + 1 },
    });
  }

  console.log("✅ Catálogos configurados correctamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
