"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

type IconName = {
  [K in keyof typeof Icons]: (typeof Icons)[K] extends LucideIcon ? K : never
}[keyof typeof Icons];

export type NavItem = {
  href: string;
  label: string;
  icon?: IconName;
};

export default function SidebarNavClient({
  items,
  brand = "App",
}: {
  items: NavItem[];
  brand?: string;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Cerrar sidebar en móviles al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Cerrar sidebar al hacer click en overlay
  useEffect(() => {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.onclick = () => setIsMobileOpen(false);
    }
  }, []);

  // Manejar overlay en móviles
  useEffect(() => {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.style.opacity = isMobileOpen ? '1' : '0';
      overlay.style.pointerEvents = isMobileOpen ? 'auto' : 'none';
    }
    
    // Prevenir scroll del body cuando el sidebar está abierto en móviles
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Header móvil con botón de menú */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 lg:hidden
                         bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-full">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-lg hover:bg-accent/80 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Abrir menú de navegación"
          >
            <Icons.Menu className="h-5 w-5" />
          </button>
          
          <h1 className="text-lg font-semibold text-foreground">{brand}</h1>
          
          <div className="w-9 h-9" /> {/* Spacer para centrar el título */}
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 border-r border-border/50 bg-card/95 backdrop-blur-md transition-transform duration-300 ease-out            lg:translate-x-0 lg:z-40",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navegación principal"
      >
        {/* Header del sidebar */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icons.Cog className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">{brand}</span>
          </div>
          
          {/* Botón cerrar en móviles */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-accent/80 transition-colors"
            aria-label="Cerrar menú"
          >
            <Icons.X className="h-4 w-4" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {items.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const IconComp = icon ? (Icons[icon] as LucideIcon) : null;
              
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium " +
                    "transition-all duration-200 ease-out group relative",
                    active
                      ? "bg-primary/10 text-primary shadow-sm border border-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {/* Indicador activo */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                  )}
                  
                  {IconComp && (
                    <IconComp 
                      className={cn(
                        "h-4 w-4 transition-all duration-200",
                        active 
                          ? "text-primary" 
                          : "text-muted-foreground group-hover:text-foreground"
                      )} 
                      aria-hidden="true" 
                    />
                  )}
                  
                  <span className="flex-1">{label}</span>
                  
                  {/* Efecto hover */}
                  {!active && (
                    <div className="absolute inset-0 rounded-lg bg-accent/0 group-hover:bg-accent/20 transition-all duration-200" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer del sidebar */}
        <div className="border-t border-border/50 p-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Sistema activo</span>
          </div>
        </div>
      </aside>
    </>
  );
}