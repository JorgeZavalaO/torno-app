#!/usr/bin/env node

/**
 * Script para probar la creación de productos con códigos equivalentes
 */

import { createProduct } from '../src/app/(protected)/inventario/actions';

async function testCreateProduct() {
  try {
    console.log('🧪 Iniciando prueba de creación de producto...');
    
    // Simular FormData con códigos equivalentes
    const formData = new FormData();
    formData.set('nombre', 'Producto de Prueba con Códigos EQ');
    formData.set('categoria', 'MATERIA_PRIMA');
    formData.set('uom', 'kg');
    formData.set('costo', '15.50');
    formData.set('stockMinimo', '10');
    
    // Agregar códigos equivalentes
    const equivalentes = [
      { sistema: 'SAP', codigo: 'MP-TEST-001', descripcion: 'Material de prueba SAP' },
      { sistema: 'ODOO', codigo: 'MAT-001-TEST', descripcion: 'Material prueba Odoo' }
    ];
    
    formData.set('equivalentes', JSON.stringify(equivalentes));
    
    console.log('📤 Enviando datos:', {
      nombre: formData.get('nombre'),
      equivalentes: formData.get('equivalentes')
    });
    
    const result = await createProduct(formData);
    
    console.log('📥 Resultado:', result);
    
    if (result.ok) {
      console.log('✅ Producto creado exitosamente:', result.sku);
    } else {
      console.error('❌ Error creando producto:', result.message);
    }
    
  } catch (error) {
    console.error('💥 Error en prueba:', error instanceof Error ? error.message : String(error));
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testCreateProduct();
}

export {};