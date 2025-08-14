import { getCurrentUser } from "@/app/lib/auth";
import SidebarNavClient, { NavItem } from "./sidebar-nav.client";
import { getUserPermissionSet } from "@/app/lib/rbac";

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
  { href: "/ot", label: "Órdenes de Trabajo", icon: "ClipboardList", requiredPerm: "workorders.read" },
  { 
    href: "/admin/permissions", 
    label: "Permisos", 
    icon: "Key", 
    requiredPerm: "permissions.read" 
  },
  { 
    href: "/admin/role-permissions", 
    label: "role-permissions", 
    icon: "Key", 
    requiredPerm: "permissions.read" 
  },
  { href: "/admin/parametros",
    label: "Parámetros",
    icon: "Sliders",
    requiredPerm: "settings.costing.read"
  },
  { href: "/cotizador",
    label: "Cotizador",
    icon: "Calculator",
    requiredPerm: "quotes.read"
  },
  { 
    href: "/clientes", 
    label: "Clientes", 
    icon: "Users2", 
    requiredPerm: "clients.read" 
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
    requiredPerm: "purchases.read" 
  },
  { href: "/control", label: "Control Producción", icon: "Factory", requiredPerm: "production.read" },
  { href: "/maquinas", label: "Máquinas", icon: "Wrench", requiredPerm: "machines.read" },
];

export default async function SidebarNavServer() {
  const me = await getCurrentUser();
  if (!me) return null;

 // ✅ Un solo roundtrip
  const permSet = await getUserPermissionSet(me.email);

  const allowed: NavItem[] = allNavItems
    .filter(item => !item.requiredPerm || permSet.has(item.requiredPerm))
    .map(({ href, label, icon }) => ({ href, label, icon }));

  return <SidebarNavClient items={allowed} brand="TornoApp" />;
}