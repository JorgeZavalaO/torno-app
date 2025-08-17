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

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export default function SidebarNavClient({
  items,
  brand = "App",
}: {
  items: Array<NavItem | NavGroup>;
  brand?: string;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  // Inicializar estado de grupos (persistir en localStorage)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('sidebar-open-groups');
      if (saved) {
        setOpenGroups(JSON.parse(saved));
        return;
      }
    } catch {
      // ignore
    }

    // Por defecto abrir "General" y cerrar otros
    const initial: Record<string, boolean> = {};
    items.forEach((it) => {
      if ((it as NavGroup).group) {
        const g = (it as NavGroup).group;
        initial[g] = g === 'General';
      }
    });
    setOpenGroups(initial);
  }, [items]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sidebar-open-groups', JSON.stringify(openGroups));
    } catch {
      // ignore
    }
  }, [openGroups]);

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
          <div className="space-y-4">
            {items.map((item) => {
              // Grupo de navegación
              if ((item as NavGroup).group && Array.isArray((item as NavGroup).items)) {
                const grp = item as NavGroup;
                const isOpen = !!openGroups[grp.group];
                return (
                  <div key={grp.group} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setOpenGroups((s) => ({ ...s, [grp.group]: !isOpen }))}
                      className="w-full flex items-center justify-between px-3 text-xs uppercase text-muted-foreground tracking-wide font-semibold py-1 hover:text-foreground"
                      aria-expanded={isOpen}
                    >
                      <span>{grp.group}</span>
                      <Icons.ChevronDown className={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : '')} />
                    </button>
                    <div className={cn('space-y-1 overflow-hidden transition-all', isOpen ? 'max-h-96' : 'max-h-0') }>
                      {grp.items.map(({ href, label, icon }) => {
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
                            {active && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                            )}

                            {IconComp && (
                              <IconComp
                                className={cn(
                                  "h-4 w-4 transition-all duration-200",
                                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )}
                                aria-hidden="true"
                              />
                            )}

                            <span className="flex-1">{label}</span>

                            {!active && (
                              <div className="absolute inset-0 rounded-lg bg-accent/0 group-hover:bg-accent/20 transition-all duration-200" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Item suelto
              const nav = item as NavItem;
              const active = pathname === nav.href || pathname.startsWith(`${nav.href}/`);
              const IconComp = nav.icon ? (Icons[nav.icon] as LucideIcon) : null;

              return (
                <Link
                  key={nav.href}
                  href={nav.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium " +
                      "transition-all duration-200 ease-out group relative",
                    active
                      ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                  )}

                  {IconComp && (
                    <IconComp
                      className={cn(
                        "h-4 w-4 transition-all duration-200",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <span className="flex-1">{nav.label}</span>

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