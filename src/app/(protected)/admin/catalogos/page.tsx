import { getCatalogosByTipo } from "@/app/server/services/catalogos";
import { assertCanReadCatalogos, assertCanWriteCatalogos } from "@/app/lib/guards";
import { CatalogosClient } from "./catalogos.client";
import { upsertCatalogoItem, deleteCatalogoItem, reorderCatalogo, resetCatalogoTipo } from "./actions";

export default async function CatalogosPage() {
  await assertCanReadCatalogos();
  let canWrite = false;
  try {
    await assertCanWriteCatalogos();
    canWrite = true;
  } catch {
    // No puede escribir
  }

  const catalogosByTipo = await getCatalogosByTipo();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración de Catálogos</h1>
        <p className="text-muted-foreground">
          Administra las listas de valores utilizadas en todo el sistema
        </p>
      </div>

      <CatalogosClient 
        catalogosByTipo={catalogosByTipo} 
        canWrite={canWrite}
        actions={{ upsertCatalogoItem, deleteCatalogoItem, reorderCatalogo, resetCatalogoTipo }}
      />
    </div>
  );
}