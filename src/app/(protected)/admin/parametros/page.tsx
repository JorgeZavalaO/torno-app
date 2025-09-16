export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";
import { getCostingParamsCached } from "@/app/server/queries/costing-params";
import { getCatalogoOptions } from "@/app/server/services/catalogos";
import ParamsClient from "./params.client";
import { bulkUpdate, resetDefaults, updateOne, pingCosting } from "./actions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Loading component for better UX
function ParamsLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Groups skeleton */}
      {[1, 2, 3].map((group) => (
        <Card key={group} className="overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/50">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </Card>
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

    const [params, monedaOptions] = await Promise.all([
      getCostingParamsCached(),
      getCatalogoOptions('MONEDA')
    ]);

    // Convert valueNumber from Decimal | null to string | null for client component
    const mappedParams = params.map((p) => ({
      ...p,
      valueNumber: p.valueNumber !== null ? p.valueNumber.toString() : null,
    }));

    return (
      <ParamsClient
        initialItems={mappedParams}
        canWrite={canWrite}
        actions={{ bulkUpdate, resetDefaults, updateOne }}
        monedaOptions={monedaOptions}
      />
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