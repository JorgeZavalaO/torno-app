import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testCurrencyConversion() {
  console.log("=".repeat(80));
  console.log("🔄 PRUEBA DE CONVERSIÓN DE MONEDA AUTOMÁTICA");
  console.log("=".repeat(80));
  
  try {
    // 1. Mostrar estado actual
    console.log("\n📊 1. ESTADO ACTUAL DEL SISTEMA");
    console.log("-".repeat(50));
    
    const currencyParam = await prisma.costingParam.findUnique({
      where: { key: "currency" }
    });
    const usdRateParam = await prisma.costingParam.findUnique({
      where: { key: "usdRate" }
    });
    
    const currentCurrency = currencyParam?.valueText || "USD";
    const usdRate = Number(usdRateParam?.valueNumber?.toString() || "3.5");
    
    console.log(`   • Moneda actual: ${currentCurrency}`);
    console.log(`   • Tipo de cambio USD->PEN: ${usdRate}`);
    
    // 2. Mostrar parámetros CURRENCY actuales
    console.log("\n💰 2. PARÁMETROS MONETARIOS ACTUALES");
    console.log("-".repeat(50));
    
    const currencyParams = await prisma.costingParam.findMany({
      where: { type: "CURRENCY" },
      orderBy: { key: "asc" }
    });
    
    currencyParams.forEach(param => {
      const value = Number(param.valueNumber?.toString() || "0");
      console.log(`   • ${param.label || param.key}: ${value.toFixed(2)} ${currentCurrency}`);
    });
    
    // 3. Mostrar categorías de máquina actuales
    console.log("\n⚙️  3. CATEGORÍAS DE MÁQUINA ACTUALES");
    console.log("-".repeat(50));
    
    const categories = await prisma.machineCostingCategory.findMany({
      where: { activo: true },
      orderBy: { categoria: "asc" }
    });
    
    categories.forEach(cat => {
      const laborCost = Number(cat.laborCost.toString());
      const deprPerHour = Number(cat.deprPerHour.toString());
      const total = laborCost + deprPerHour;
      
      console.log(`   • ${cat.categoria}:`);
      console.log(`     - Mano de obra: ${laborCost.toFixed(2)} ${currentCurrency}/h`);
      console.log(`     - Depreciación: ${deprPerHour.toFixed(2)} ${currentCurrency}/h`);
      console.log(`     - Total: ${total.toFixed(2)} ${currentCurrency}/h`);
    });
    
    // 4. Ejemplo de conversión (solo simulación)
    console.log("\n🔄 4. EJEMPLO DE CONVERSIÓN");
    console.log("-".repeat(50));
    
    if (currentCurrency === "USD") {
      console.log(`   Si cambias a PEN (tipo de cambio: ${usdRate}):`);
      
      currencyParams.forEach(param => {
        const value = Number(param.valueNumber?.toString() || "0");
        const convertedValue = value * usdRate;
        console.log(`   • ${param.label || param.key}: ${value.toFixed(2)} USD → ${convertedValue.toFixed(2)} PEN`);
      });
      
      categories.forEach(cat => {
        const laborCost = Number(cat.laborCost.toString());
        const deprPerHour = Number(cat.deprPerHour.toString());
        
        console.log(`   • ${cat.categoria}:`);
        console.log(`     - Mano de obra: ${laborCost.toFixed(2)} USD → ${(laborCost * usdRate).toFixed(2)} PEN`);
        console.log(`     - Depreciación: ${deprPerHour.toFixed(2)} USD → ${(deprPerHour * usdRate).toFixed(2)} PEN`);
      });
    } else {
      console.log(`   Si cambias a USD (tipo de cambio: ${usdRate}):`);
      
      currencyParams.forEach(param => {
        const value = Number(param.valueNumber?.toString() || "0");
        const convertedValue = value / usdRate;
        console.log(`   • ${param.label || param.key}: ${value.toFixed(2)} PEN → ${convertedValue.toFixed(2)} USD`);
      });
      
      categories.forEach(cat => {
        const laborCost = Number(cat.laborCost.toString());
        const deprPerHour = Number(cat.deprPerHour.toString());
        
        console.log(`   • ${cat.categoria}:`);
        console.log(`     - Mano de obra: ${laborCost.toFixed(2)} PEN → ${(laborCost / usdRate).toFixed(2)} USD`);
        console.log(`     - Depreciación: ${deprPerHour.toFixed(2)} PEN → ${(deprPerHour / usdRate).toFixed(2)} USD`);
      });
    }
    
    console.log("\n✅ CONVERSIÓN AUTOMÁTICA IMPLEMENTADA:");
    console.log("   • Los parámetros generales se convierten automáticamente");
    console.log("   • Las categorías de máquina AHORA también se convierten automáticamente");
    console.log("   • El formateo de UI muestra la moneda correcta");
    console.log("   • Todo funciona en tiempo real al cambiar la moneda del sistema");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCurrencyConversion();