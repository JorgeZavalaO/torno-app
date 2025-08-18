import { getCurrentUser } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardKPIs } from "@/app/server/queries/dashboard";

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const kpis = await getDashboardKPIs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Resumen general del sistema
        </div>
      </div>
      
      <DashboardView kpis={kpis} />
    </div>
  );
}
