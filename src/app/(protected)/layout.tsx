import { getCurrentUser } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SidebarNavServer from "@/components/sidebar/sidebar-nav.server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login"); // o /api/auth/signin

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex min-h-dvh">
        <SidebarNavServer />
        <main id="main" className="flex-1 min-w-0 ml-0 lg:ml-72 transition-all duration-300 ease-out">
          <div className="h-16 lg:hidden" />
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
