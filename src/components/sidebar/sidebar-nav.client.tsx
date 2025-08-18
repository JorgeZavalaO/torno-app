"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavUser, type SidebarUser } from "./nav-user";

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
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export default function SidebarNavClient({
  items,
  brand = "App",
  user,
}: {
  items: Array<NavItem | NavGroup>;
  brand?: string;
  user?: SidebarUser;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // persistimos los grupos abiertos
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sidebar-open-groups");
      if (saved) {
        setOpenGroups(JSON.parse(saved));
        return;
      }
    } catch {}
    const initial: Record<string, boolean> = {};
    items.forEach((it) => {
      if ((it as NavGroup).group) {
        const g = (it as NavGroup).group;
        initial[g] = g === "General";
      }
    });
    setOpenGroups(initial);
  }, [items]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "sidebar-open-groups",
        JSON.stringify(openGroups),
      );
    } catch {}
  }, [openGroups]);

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* Header del sidebar (brand) */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 grid place-items-center">
                  <Icons.Cog className="h-4 w-4 text-primary" />
                </div>
                <span>{brand}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Contenido de navegación */}
      <SidebarContent>
        {/* Render de items sueltos */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter((i) => !(i as NavGroup).group)
                .map((nav) => {
                  const it = nav as NavItem;
                  const active =
                    pathname === it.href || pathname.startsWith(`${it.href}/`);
                  const IconComp = it.icon
                    ? (Icons[it.icon] as LucideIcon)
                    : null;
                  return (
                    <SidebarMenuItem key={it.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={it.href} className="group">
                          {IconComp && <IconComp className="h-4 w-4" />}
                          <span>{it.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Render de grupos */}
        {items
          .filter((i) => (i as NavGroup).group)
          .map((g) => {
            const grp = g as NavGroup;
            const isOpen = !!openGroups[grp.group];
            return (
              <SidebarGroup key={grp.group}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((s) => ({ ...s, [grp.group]: !isOpen }))
                  }
                  className="w-full flex items-center justify-between text-xs uppercase text-muted-foreground tracking-wide font-semibold py-1 px-2 hover:text-foreground"
                  aria-expanded={isOpen}
                >
                  <SidebarGroupLabel>{grp.group}</SidebarGroupLabel>
                  <Icons.ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen ? "rotate-180" : "",
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "overflow-hidden transition-[max-height] duration-300",
                    isOpen ? "max-h-96" : "max-h-0",
                  )}
                >
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {grp.items.map(({ href, label, icon }) => {
                        const active =
                          pathname === href || pathname.startsWith(`${href}/`);
                        const IconComp = icon
                          ? (Icons[icon] as LucideIcon)
                          : null;
                        return (
                          <SidebarMenuItem key={href}>
                            <SidebarMenuButton asChild isActive={active}>
                              <Link href={href} className="group">
                                {IconComp && <IconComp className="h-4 w-4" />}
                                <span>{label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </div>
              </SidebarGroup>
            );
          })}
      </SidebarContent>

      {/* Footer con NavUser */}
      <SidebarFooter>
        <NavUser user={user ?? {}} />
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground px-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Sistema activo</span>
        </div>
      </SidebarFooter>

      {/* Rail para modo colapsado */}
      <SidebarRail />
    </Sidebar>
  );
}
