"use client";

import { LogOut, User, Settings, HelpCircle, Bell } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  status?: 'online' | 'away' | 'busy' | 'offline';
  notificationCount?: number;
};

export function NavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar();

  const initials =
    user?.name?.trim()?.split(/\s+/)?.slice(0, 2).map(s => s[0]?.toUpperCase()).join("") ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string | undefined) => {
    switch (status) {
      case 'online': return 'En línea';
      case 'away': return 'Ausente';
      case 'busy': return 'Ocupado';
      default: return 'Desconectado';
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="group relative hover:bg-accent/50 data-[state=open]:bg-accent/60 transition-colors p-2.5 rounded-lg"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user?.image ? (
                    <AvatarImage src={user.image} alt={user?.name ?? "avatar"} className="rounded-lg" />
                  ) : (
                    <AvatarFallback className="rounded-lg bg-muted text-foreground/70 font-medium">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* Status indicator */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor(user?.status)}`} />
              </div>
              
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-foreground">
                    {user?.name || "Usuario"}
                  </span>
                  {(user?.notificationCount ?? 0) > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 text-[10px] px-1">
                      {(user.notificationCount ?? 0) > 99 ? '99+' : (user.notificationCount ?? 0)}
                    </Badge>
                  )}
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.role || user?.email}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-lg border bg-background"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            {/* User Info Header */}
            <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-3 px-3 py-2.5 text-left">
                <div className="relative">
          <Avatar className="h-9 w-9 rounded-lg">
                    {user?.image ? (
            <AvatarImage src={user.image} alt={user?.name ?? "avatar"} className="rounded-lg" />
                    ) : (
            <AvatarFallback className="rounded-lg bg-muted text-foreground/70 font-medium">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(user?.status)}`} />
                </div>
                <div className="grid flex-1 text-left leading-tight min-w-0">
          <span className="truncate font-medium text-foreground text-sm">
                    {user?.name || "Usuario"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {getStatusText(user?.status)}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="mx-2" />

            {/* Quick Actions */}
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md mx-2 hover:bg-accent/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">Mi Perfil</span>
                    <p className="text-xs text-muted-foreground">Ver y editar perfil</p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md mx-2 hover:bg-accent/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                    <Settings className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">Configuración</span>
                    <p className="text-xs text-muted-foreground">Preferencias del sistema</p>
                  </div>
                </Link>
              </DropdownMenuItem>

                {(user?.notificationCount ?? 0) > 0 && (
                  <DropdownMenuItem asChild>
                    <Link href="/notifications" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md mx-2 hover:bg-accent/50">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-orange-500/10 relative">
                        <Bell className="h-4 w-4 text-orange-600" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Notificaciones</span>
                        <p className="text-xs text-muted-foreground">{(user.notificationCount ?? 0)} nuevas</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

              <DropdownMenuItem asChild>
                <Link href="/help" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md mx-2 hover:bg-accent/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10">
                    <HelpCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">Ayuda</span>
                    <p className="text-xs text-muted-foreground">Soporte y documentación</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="mx-2" />

            {/* Logout */}
            <div className="p-2">
              <DropdownMenuItem asChild>
                <Link href="/signout" className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/10">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">Cerrar Sesión</span>
                    <p className="text-xs opacity-75">Salir del sistema</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}