/**
 * Simula la creación de una cotización real para validar el flujo completo
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const D = (val: string | number | Prisma.Decimal) => new Prisma.Decimal(val.toString());
const n2 = (d: Prisma.Decimal) => Number(d.toFixed(2));

async function simulateRealQuote() {
  console.log("🎯 Simulando creación de cotización real...\n");

  // 1. Obtener un cliente de prueba
  const cliente = await prisma.cliente.findFirst({
    where: { activo: true },
  });

  if (!cliente) {
    console.error("❌ No hay clientes activos. Crea uno primero.");
    process.exit(1);
  }

  console.log(`📋 Cliente: ${cliente.nombre} (${cliente.ruc})`);

  // 2. Obtener parámetros (simulando getCostingValues)
  const params = await prisma.costingParam.findMany();
  const values: Record<string, string | number> = {};
  
  for (const param of params) {
    if (param.type === "TEXT") {
      values[param.key] = param.valueText ?? "";
    } else {
      values[param.key] = param.valueNumber ? Number(param.valueNumber.toString()) : 0;
    }
  }

  console.log("\n📊 Parámetros de costeo:");
  console.log(`  - Currency: ${values.currency}`);
  console.log(`  - GI: ${(Number(values.gi) * 100).toFixed(2)}%`);
  console.log(`  - Margin: ${(Number(values.margin) * 100).toFixed(2)}%`);
  console.log(`  - Hourly Rate: $${Number(values.hourlyRate).toFixed(2)}/h`);
  console.log(`  - Depreciation: $${Number(values.deprPerHour).toFixed(2)}/h`);
  console.log(`  - Energy: $${Number(values.kwhRate).toFixed(2)}/h`);
  console.log(`  - Tooling: $${Number(values.toolingPerPiece).toFixed(2)}/piece`);
  console.log(`  - Rent: $${Number(values.rentPerHour).toFixed(2)}/h`);

  // 3. Datos de entrada de la cotización
  const input = {
    clienteId: cliente.id,
    qty: 20,
    materials: 150,
    hours: 8,
  };

  console.log("\n💼 Datos de la cotización:");
  console.log(`  - Cantidad: ${input.qty} piezas`);
  console.log(`  - Materiales: $${input.materials}`);
  console.log(`  - Horas de trabajo: ${input.hours}h`);

  // 4. Cálculo (exactamente como en actions.ts)
  const currency = String(values.currency || "USD");
  const gi = D(values.gi ?? 0);
  const margin = D(values.margin ?? 0);
  const hourlyRate = D(values.hourlyRate ?? 0);
  const kwhRate = D(values.kwhRate ?? 0);
  const depr = D(values.deprPerHour ?? 0);
  const tooling = D(values.toolingPerPiece ?? 0);
  const rent = D(values.rentPerHour ?? 0);

  const qty = D(input.qty);
  const materials = D(input.materials);
  const hours = D(input.hours);

  const laborCost = hourlyRate.mul(hours);
  const energyCost = kwhRate.mul(hours);
  const deprCost = depr.mul(hours);
  const toolingCost = tooling.mul(qty);
  const rentCost = rent.mul(hours);

  const direct = materials.plus(laborCost).plus(energyCost).plus(deprCost).plus(toolingCost).plus(rentCost);
  const giAmount = direct.mul(gi);
  const subtotal = direct.plus(giAmount);
  const marginAmount = subtotal.mul(margin);
  const total = subtotal.plus(marginAmount);
  const unitPrice = qty.gt(0) ? total.div(qty) : total;

  console.log("\n💰 Cálculo de costos:");
  console.log(`  1. Materiales: $${n2(materials)}`);
  console.log(`  2. Mano de obra: $${n2(laborCost)} (${hours}h × $${hourlyRate}/h)`);
  console.log(`  3. Energía: $${n2(energyCost)} (${hours}h × $${kwhRate}/h)`);
  console.log(`  4. Depreciación: $${n2(deprCost)} (${hours}h × $${depr}/h)`);
  console.log(`  5. Herramientas: $${n2(toolingCost)} (${qty} piezas × $${tooling}/pieza)`);
  console.log(`  6. Alquiler: $${n2(rentCost)} (${hours}h × $${rent}/h)`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Costo Directo: $${n2(direct)}`);
  console.log(`  + GI (${(Number(gi) * 100).toFixed(0)}%): $${n2(giAmount)}`);
  console.log(`  = Subtotal: $${n2(subtotal)}`);
  console.log(`  + Margen (${(Number(margin) * 100).toFixed(0)}%): $${n2(marginAmount)}`);
  console.log(`  = TOTAL: $${n2(total)}`);
  console.log(`  Precio unitario: $${n2(unitPrice)}/pieza`);

  const breakdown = {
    inputs: {
      qty: input.qty,
      materials: n2(materials),
      hours: n2(hours),
    },
    params: {
      currency,
      gi: Number(gi.toString()),
      margin: Number(margin.toString()),
      hourlyRate: Number(hourlyRate.toString()),
      kwhRate: Number(kwhRate.toString()),
      deprPerHour: Number(depr.toString()),
      toolingPerPiece: Number(tooling.toString()),
      rentPerHour: Number(rent.toString()),
    },
    costs: {
      materials: n2(materials),
      labor: n2(laborCost),
      energy: n2(energyCost),
      depreciation: n2(deprCost),
      tooling: n2(toolingCost),
      rent: n2(rentCost),
      direct: n2(direct),
      giAmount: n2(giAmount),
      subtotal: n2(subtotal),
      marginAmount: n2(marginAmount),
      total: n2(total),
      unitPrice: n2(unitPrice),
    },
  };

  // 5. Crear la cotización en la base de datos
  console.log("\n💾 Creando cotización en la base de datos...");

  try {
    const created = await prisma.cotizacion.create({
      data: {
        clienteId: input.clienteId,
        currency,
        giPct: gi,
        marginPct: margin,
        hourlyRate,
        kwhRate,
        deprPerHour: depr,
        toolingPerPc: tooling,
        rentPerHour: rent,

        qty: input.qty,
        materials,
        hours,
        // kwh ya no se usa

        costDirect: direct,
        giAmount,
        subtotal,
        marginAmount,
        total,
        unitPrice,
        breakdown,

        status: "DRAFT",
      },
    });

    console.log(`✅ Cotización creada exitosamente!`);
    console.log(`   ID: ${created.id}`);
    console.log(`   Total: $${n2(total)}`);
    console.log(`   Estado: ${created.status}`);

    // 6. Validar que se guardó correctamente
    const retrieved = await prisma.cotizacion.findUnique({
      where: { id: created.id },
      include: { cliente: true },
    });

    if (retrieved) {
      console.log("\n✅ Validación: Cotización recuperada de la DB");
      console.log(`   Cliente: ${retrieved.cliente?.nombre}`);
      console.log(`   Total guardado: $${Number(retrieved.total.toString()).toFixed(2)}`);
      console.log(`   Breakdown guardado: ${Object.keys(retrieved.breakdown || {}).length} propiedades`);

      // Verificar breakdown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const savedBreakdown = retrieved.breakdown as any;
      if (savedBreakdown?.costs) {
        console.log("\n📊 Costos guardados en breakdown:");
        console.log(`   - Labor: $${savedBreakdown.costs.labor}`);
        console.log(`   - Energy: $${savedBreakdown.costs.energy}`);
        console.log(`   - Depreciation: $${savedBreakdown.costs.depreciation}`);
        console.log(`   - Tooling: $${savedBreakdown.costs.tooling}`);
        console.log(`   - Rent: $${savedBreakdown.costs.rent}`);

        // Validaciones finales
        const validations = [
          savedBreakdown.costs.labor > 0,
          savedBreakdown.costs.energy > 0,
          savedBreakdown.costs.depreciation > 0,
          savedBreakdown.costs.tooling > 0,
          savedBreakdown.costs.rent > 0,
        ];

        if (validations.every(v => v)) {
          console.log("\n✅ TODOS LOS COSTOS SON MAYORES A 0 - CÁLCULO CORRECTO");
        } else {
          console.log("\n❌ ADVERTENCIA: Algunos costos son 0");
        }
      }

      console.log(`\n🔗 Puedes ver la cotización en: http://localhost:3000/cotizador/${created.id}`);
    }

  } catch (error) {
    console.error("\n❌ Error creando la cotización:", error);
    throw error;
  }

  await prisma.$disconnect();
}

simulateRealQuote().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
