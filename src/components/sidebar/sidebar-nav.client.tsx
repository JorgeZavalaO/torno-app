"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavUser, type SidebarUser } from "./nav-user";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";

type IconName = {
  [K in keyof typeof Icons]: (typeof Icons)[K] extends LucideIcon ? K : never
}[keyof typeof Icons];

export type NavItem = {
  href: string;
  label: string;
  icon?: IconName;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  isNew?: boolean;
  description?: string;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
  groupIcon?: IconName;
  isCollapsible?: boolean;
};

export default function SidebarNavClient({
  items,
  brand = "TornoApp",
  user,
}: {
  items: NavGroup[];
  brand?: string;
  user?: SidebarUser;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Persistir grupos abiertos
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("torno-sidebar-groups");
      if (saved) {
        setOpenGroups(JSON.parse(saved));
        return;
      }
    } catch {}
    
    // Todos los grupos abiertos por defecto
    const initial: Record<string, boolean> = {};
    items.forEach((group) => {
      initial[group.group] = true;
    });
    setOpenGroups(initial);
  }, [items]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "torno-sidebar-groups",
        JSON.stringify(openGroups),
      );
    } catch {}
  }, [openGroups]);

  const isActivePath = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // Filtrar items basado en búsqueda
  const filteredItems = items.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <TooltipProvider>
      <Sidebar 
        variant="inset" 
        collapsible="icon" 
        className="border-r border-border/20 bg-background"
      >
        {/* Header mejorado */}
        <SidebarHeader className="px-4 py-3 border-b border-border/10">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="font-medium hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold tracking-tight">{brand}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Barra de búsqueda */}
        <div className="px-4 py-3 border-b border-border/10">
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar en menú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm bg-muted/40 border border-border/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-transparent"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <Icons.X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Contenido de navegación mejorado */}
        <SidebarContent className="px-2 py-3 space-y-1">
          {filteredItems.map((group) => (
            <SidebarGroup key={group.group} className="space-y-1">
              {/* Group Header */}
              <div className="flex items-center justify-between px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.group)}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium",
                    "text-muted-foreground hover:text-foreground"
                  )}
                  aria-expanded={openGroups[group.group]}
                >
                  {group.groupIcon && (
                    (() => {
                      const IconComp = Icons[group.groupIcon] as LucideIcon;
                      return IconComp ? (
                        <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : null;
                    })()
                  )}
                  <SidebarGroupLabel className="">
                    {group.group}
                  </SidebarGroupLabel>
                  {group.isCollapsible !== false && (
                    <Icons.ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform ml-1",
                        openGroups[group.group] ? "rotate-90" : "",
                      )}
                    />
                  )}
                </button>
              </div>

              {/* Group Items */}
              {openGroups[group.group] && (
                <SidebarGroupContent className="space-y-0.5">
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isActivePath(item.href);
                      const IconComp = item.icon ? Icons[item.icon] as LucideIcon : null;
                      
                      return (
                        <SidebarMenuItem key={item.href}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton asChild>
                                <Link 
                                  href={item.href} 
                                  className={cn(
                                    "group flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors",
                                    active
                                      ? "bg-accent text-foreground"
                                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                  )}
                                >
                                  {/* Icon minimal */}
                                  {IconComp && (
                                    <IconComp className={cn("h-4 w-4",
                                      active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                    )} />
                                  )}
                                  
                                  {/* Label and description */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate">{item.label}</span>
                                    </div>
                                  </div>
                                </Link>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-2">
                              <div>
                                <p className="font-medium">{item.label}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          ))}

          {/* Empty state for search */}
          {searchQuery && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Icons.SearchX className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No se encontraron resultados</p>
              <p className="text-xs text-muted-foreground/70 text-center">
                No hay elementos que coincidan con &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </SidebarContent>

        {/* Footer mejorado */}
        <SidebarFooter className="p-3 border-t border-border/10">
          <NavUser user={user ?? {}} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}