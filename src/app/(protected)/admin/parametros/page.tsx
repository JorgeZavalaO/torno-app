export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getCostingParamsCached } from "@/app/server/queries/costing-params";
import { getMachineCostingCategoriesWithStats } from "@/app/server/queries/machine-costing-categories";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import TabsSection from "./TabsSection.client";
import { bulkUpdate, resetDefaults, updateOne, pingCosting } from "@/server/actions/parametros-actions";
import { upsertCategoryAction, deleteCategoryAction, syncCategoriesFromMachines } from "@/server/actions/category-actions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";


// Minimal loading component
function ParamsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Simple header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Clean skeleton cards */}
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="p-4 space-y-3 border-0 shadow-sm">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-16" />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Error boundary component
// Error boundary component removed because it was unused.
// Main params component with error handling
async function ParamsContent() {
  try {
    const me = await getCurrentUser();
    if (!me) redirect("/handler/sign-in");

    const [canRead, canWrite] = await Promise.all([
      userHasPermission(me.email, "settings.costing.read"),
      userHasPermission(me.email, "settings.costing.write"),
    ]);
    
    if (!canRead) redirect("/");

    // Validate permissions and ensure defaults
    await pingCosting();

    const [params, categories, monedaOptions] = await Promise.all([
      getCostingParamsCached(),
      getMachineCostingCategoriesWithStats(),
      getCatalogoOptions('MONEDA')
    ]);

    // Convert valueNumber from Decimal | null to string | null for client component
    const mappedParams = params.map((p) => ({
      ...p,
      valueNumber: p.valueNumber !== null ? p.valueNumber.toString() : null,
    }));

    const mappedCategories = categories.map((c) => ({
      ...c,
      laborCost: c.laborCost.toString(),
      deprPerHour: c.deprPerHour.toString(),
    }));

    // Obtener moneda del sistema y tipo de cambio
    const currencyParam = params.find(p => p.key === "currency");
    const currency = String(currencyParam?.valueText ?? "USD").toUpperCase();
    const usdRateParam = params.find(p => p.key === "usdRate");
    const tipoCambio = usdRateParam?.valueNumber ? Number(usdRateParam.valueNumber.toString()) : 3.5;

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Minimal header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Parámetros del Sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura las tarifas, márgenes y categorías de costeo del taller
          </p>
        </div>

        <TabsSection
          mappedCategories={mappedCategories}
          mappedParams={mappedParams as unknown as {
            id: string;
            key: string;
            label: string | null;
            group: string | null;
            type: "NUMBER" | "PERCENT" | "CURRENCY" | "TEXT";
            valueNumber: string | null;
            valueText: string | null;
            unit: string | null;
          }[]}
          canWrite={canWrite}
          currency={currency}
          tipoCambio={tipoCambio}
          categoryActions={{
            upsert: upsertCategoryAction,
            delete: deleteCategoryAction,
            sync: syncCategoriesFromMachines,
          }}
          paramActions={{ bulkUpdate, resetDefaults, updateOne }}
          monedaOptions={monedaOptions as unknown as Array<{ value: string; label: string; color: string | null; icono: string | null; descripcion: string | null }>}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading costing params:", error);
    throw error;
  }
}

export default function CostingParamsPage() {
  return (
    <Suspense fallback={<ParamsLoading />}>
      <ParamsContent />
    </Suspense>
  );
}