/**
 * Script de prueba para verificar la funcionalidad de subcategorías en tipos de trabajo
 */
import { upsertCatalogoItem } from "@/app/(protected)/admin/catalogos/actions";
import { TipoCatalogo } from "@prisma/client";

async function testSubcategorias() {
  console.log("🧪 Probando funcionalidad de subcategorías...\n");

  // Crear un FormData simulado para una subcategoría
  const formData = new FormData();
  formData.append("tipo", TipoCatalogo.TIPO_TRABAJO);
  formData.append("codigo", "TEST_SUBCATEGORIA");
  formData.append("nombre", "Subcategoría de Prueba");
  formData.append("descripcion", "Esta es una subcategoría de prueba");
  formData.append("orden", "10");
  formData.append("activo", "true");
  formData.append("isSubcategory", "true");
  formData.append("parent", "SERVICIOS");

  try {
    console.log("📝 Creando subcategoría de prueba...");
    const result = await upsertCatalogoItem(formData);

    if (result.ok) {
      console.log("✅ Subcategoría creada exitosamente:", result.message);
      console.log("🆔 ID del elemento creado:", result.id);
    } else {
      console.log("❌ Error al crear subcategoría:", result.message);
    }
  } catch (error) {
    console.error("💥 Error inesperado:", error);
  }

  // Probar crear un tipo principal
  const formData2 = new FormData();
  formData2.append("tipo", TipoCatalogo.TIPO_TRABAJO);
  formData2.append("codigo", "TEST_PRINCIPAL");
  formData2.append("nombre", "Tipo Principal de Prueba");
  formData2.append("descripcion", "Este es un tipo principal de prueba");
  formData2.append("orden", "11");
  formData2.append("activo", "true");
  formData2.append("isSubcategory", "false");

  try {
    console.log("\n📝 Creando tipo principal de prueba...");
    const result2 = await upsertCatalogoItem(formData2);

    if (result2.ok) {
      console.log("✅ Tipo principal creado exitosamente:", result2.message);
      console.log("🆔 ID del elemento creado:", result2.id);
    } else {
      console.log("❌ Error al crear tipo principal:", result2.message);
    }
  } catch (error) {
    console.error("💥 Error inesperado:", error);
  }

  console.log("\n🎯 Prueba completada!");
}

// Ejecutar la prueba
testSubcategorias();