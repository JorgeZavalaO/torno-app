#!/usr/bin/env node

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const scripts = [
  {
    name: "Inicializar stock de herramientas",
    file: "init-tool-stock.ts",
    description: "Crea 100 unidades de stock + instancias para cada herramienta",
  },
  {
    name: "Crear instancias desde stock existente",
    file: "create-tool-instances.ts",
    description: "Crea ToolInstance para herramientas con stock ya registrado",
  },
  {
    name: "Actualizar códigos de herramientas",
    file: "update-tool-codes.ts",
    description: "Actualiza todos los códigos al formato secuencial (SKU-000001)",
  },
  {
    name: "Verificar códigos de herramientas",
    file: "verify-tool-codes.ts",
    description: "Muestra resumen de todas las herramientas y sus códigos",
  },
];

async function runScript(scriptFile: string): Promise<boolean> {
  try {
    const scriptPath = path.join(__dirname, scriptFile);
    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ Script no encontrado: ${scriptPath}`);
      return false;
    }

    console.log(`\n🚀 Ejecutando ${scriptFile}...\n`);
    execSync(`pnpm tsx ${scriptPath}`, { stdio: "inherit" });
    return true;
  } catch {
    console.error(`\n❌ Error ejecutando ${scriptFile}`);
    return false;
  }
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🛠️  GESTOR DE HERRAMIENTAS");
  console.log("=".repeat(60));

  console.log("\nOpciones disponibles:");
  scripts.forEach((script, idx) => {
    console.log(`  ${idx + 1}. ${script.name}`);
    console.log(`     ${script.description}`);
  });
  console.log("\n  0. Salir");

  // Por defecto, mostrar el menú
  console.log("\n💡 Uso: pnpm tsx scripts/manage-tools.ts [opción]");
  console.log("Ejemplo: pnpm tsx scripts/manage-tools.ts 1\n");

  const arg = process.argv[2];

  if (!arg) {
    console.log("ℹ️  Especifica una opción (1-3) como argumento");
    process.exit(0);
  }

  const option = parseInt(arg, 10);

  if (option < 1 || option > scripts.length) {
    console.error("❌ Opción inválida");
    process.exit(1);
  }

  const selectedScript = scripts[option - 1];
  console.log(`\n✨ Ejecutando: ${selectedScript.name}`);

  const success = await runScript(selectedScript.file);
  process.exit(success ? 0 : 1);
}

main();
