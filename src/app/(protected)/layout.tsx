import { getCurrentUser } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SidebarNavServer from "@/components/sidebar/sidebar-nav.server";

// Accesibilidad: skip link mejorado
function SkipToContent() {
  return (
    <a 
      href="#main" 
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 z-[60] 
                 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg 
                 px-4 py-2.5 text-sm font-medium shadow-lg
                 transition-all duration-200 focus:scale-105 focus:shadow-xl
                 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
    >
      Saltar al contenido
    </a>
  );
}

// Componente para el fondo con gradiente sutil
function BackgroundPattern() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Gradiente base más sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      
      {/* Patrón de puntos más sutil */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground)) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />
      
      {/* Efectos de luz más sutiles */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
    </div>
  );
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/handler/sign-in");
  
  return (
    <div className="min-h-dvh bg-background">
      <BackgroundPattern />
      <SkipToContent />
      
      {/* Overlay para móviles cuando el sidebar está abierto */}
      <div 
        id="sidebar-overlay" 
        className="fixed inset-0 z-30 bg-black/50 opacity-0 pointer-events-none
                   transition-opacity duration-300 ease-out lg:hidden"
      />
      
      <div className="flex min-h-dvh">
        {/* Sidebar */}
        <SidebarNavServer />
        
        {/* Contenido principal con margen correcto */}
        <main 
          id="main" 
          className="flex-1 min-w-0
                     ml-0 lg:ml-72
                     transition-all duration-300 ease-out"
        >
          {/* Header espacial para móviles */}
          <div className="h-16 lg:hidden" />
          
          {/* Contenedor principal */}
          <div 
            className="p-4 sm:p-6 lg:p-8
                       animate-in fade-in slide-in-from-bottom-2 
                       duration-700 ease-out"
          >
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}