/**
 * Script para verificar la estructura de tipos de trabajo en la base de datos
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarTiposTrabajo() {
  console.log("🔍 Verificando estructura de tipos de trabajo...\n");

  try {
    const tiposTrabajo = await prisma.configuracionCatalogo.findMany({
      where: {
        tipo: 'TIPO_TRABAJO',
        activo: true
      },
      orderBy: { orden: 'asc' }
    });

    console.log(`📊 Encontrados ${tiposTrabajo.length} tipos de trabajo activos:\n`);

    tiposTrabajo.forEach((tipo, index) => {
      console.log(`${index + 1}. ${tipo.nombre} (${tipo.codigo})`);
      console.log(`   Descripción: ${tipo.descripcion || 'Sin descripción'}`);
      console.log(`   Orden: ${tipo.orden}`);

      if (tipo.propiedades) {
        const props = JSON.parse(tipo.propiedades);
        if (props.parent) {
          console.log(`   🔗 Subcategoría de: ${props.parent}`);
        }
        if (props.isSubcategory) {
          console.log(`   📂 Es subcategoría: Sí`);
        }
      }
      console.log('');
    });

    // Verificar estructura jerárquica
    const principales = tiposTrabajo.filter(t => {
      if (!t.propiedades) return true;
      const props = JSON.parse(t.propiedades);
      return !props.isSubcategory;
    });

    const subcategorias = tiposTrabajo.filter(t => {
      if (!t.propiedades) return false;
      const props = JSON.parse(t.propiedades);
      return props.isSubcategory;
    });

    console.log(`🏗️  Estructura jerárquica:`);
    console.log(`   Principales: ${principales.length}`);
    console.log(`   Subcategorías: ${subcategorias.length}`);

    principales.forEach(principal => {
      console.log(`   📁 ${principal.nombre}:`);
      const subs = subcategorias.filter(sub => {
        if (!sub.propiedades) return false;
        const props = JSON.parse(sub.propiedades);
        return props.parent === principal.codigo;
      });
      subs.forEach(sub => {
        console.log(`      └── ${sub.nombre}`);
      });
    });

  } catch (error) {
    console.error("❌ Error al verificar tipos de trabajo:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarTiposTrabajo();