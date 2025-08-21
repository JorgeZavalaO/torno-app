import { getCurrentUser } from "@/app/lib/auth";
import SidebarNavServer from "@/components/sidebar/sidebar-nav.server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner"

export default async function ProtectedLayout({
  children,
}: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <SidebarProvider>
      {/* Sidebar completo (server + client) */}
      <SidebarNavServer />

      {/* Contenido (inset) */}
      <SidebarInset>
        {/* Header superior con trigger para móvil/colapsado */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">TornoApp</h1>
        </header>

        <main className="py-4">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
