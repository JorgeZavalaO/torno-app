/**
 * Script de prueba para verificar la funcionalidad de reset de tipos de trabajo
 */
import { resetCatalogoTipo } from "@/app/(protected)/admin/catalogos/actions";
import { TipoCatalogo } from "@prisma/client";

async function testResetTiposTrabajo() {
  console.log("🔄 Probando reset de tipos de trabajo...");

  try {
    const result = await resetCatalogoTipo(TipoCatalogo.TIPO_TRABAJO);

    if (result.ok) {
      console.log("✅ Reset exitoso:", result.message);
    } else {
      console.log("❌ Error en reset:", result.message);
    }
  } catch (error) {
    console.error("💥 Error inesperado:", error);
  }
}

// Ejecutar la prueba
testResetTiposTrabajo();