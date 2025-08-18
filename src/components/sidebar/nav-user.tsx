"use client";

import { LogOut, User, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

export type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function NavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar();

  const initials =
    user?.name?.trim()?.split(/\s+/)?.slice(0, 2).map(s => s[0]?.toUpperCase()).join("") ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user?.image ? (
                  <AvatarImage src={user.image} alt={user?.name ?? "avatar"} />
                ) : (
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name || "Usuario"}</span>
                <span className="truncate text-xs">{user?.email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user?.image ? (
                    <AvatarImage src={user.image} alt={user?.name ?? "avatar"} />
                  ) : (
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name || "Usuario"}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account" className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  Cuenta
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/signout" className="flex items-center gap-2 text-red-600">
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
