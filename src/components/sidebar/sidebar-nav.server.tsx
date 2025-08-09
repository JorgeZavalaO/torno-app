import { userHasPermission } from "@/app/lib/rbac";
import { getCurrentUser } from "@/app/lib/auth";
import SidebarNavClient, { NavItem } from "./sidebar-nav.client";

const allNavItems: (NavItem & { requiredPerm?: string })[] = [
  { 
    href: "/dashboard", 
    label: "Dashboard", 
    icon: "LayoutDashboard" 
  }, // público tras login
  { 
    href: "/admin/users", 
    label: "Usuarios", 
    icon: "Users", 
    requiredPerm: "roles.read" 
  },
  { 
    href: "/admin/roles", 
    label: "Roles", 
    icon: "Shield", 
    requiredPerm: "roles.read" 
  },
  { 
    href: "/admin/permissions", 
    label: "Permisos", 
    icon: "Key", 
    requiredPerm: "permissions.read" 
  },
  { 
    href: "/inventario", 
    label: "Inventario", 
    icon: "Package", 
    requiredPerm: "inventory.read" 
  },
  { 
    href: "/compras", 
    label: "Compras", 
    icon: "ShoppingCart", 
    requiredPerm: "purchasing.read" 
  },
  { 
    href: "/produccion", 
    label: "Producción", 
    icon: "Factory", 
    requiredPerm: "production.read" 
  },
  { 
    href: "/mantenimiento", 
    label: "Mantenimiento", 
    icon: "Wrench", 
    requiredPerm: "maintenance.read" 
  },
  { 
    href: "/reportes", 
    label: "Reportes", 
    icon: "BarChart3", 
    requiredPerm: "reports.read" 
  },
];

export default async function SidebarNavServer() {
  const me = await getCurrentUser();
  if (!me) return null;

  const allowed: NavItem[] = [];
  
  for (const item of allNavItems) {
    if (!item.requiredPerm) {
      // Item público después del login
      allowed.push(item);
      continue;
    }
    
    const hasPermission = await userHasPermission(me.email, item.requiredPerm);
    if (hasPermission) {
      allowed.push(item);
    }
  }

  return <SidebarNavClient items={allowed} brand="TornoApp" />;
}