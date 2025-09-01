import { getCurrentUser } from "@/app/lib/auth";
import SidebarNavClient, { NavItem, NavGroup } from "./sidebar-nav.client";
import type { SidebarUser } from "./nav-user";
import { getUserPermissionSet } from "@/app/lib/rbac";

const allNavItems: (NavItem & { requiredPerm?: string; group?: string })[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", group: "dashboard", description: "Panel principal de control" },
  { href: "/ot", label: "Órdenes de Trabajo", icon: "ClipboardList", requiredPerm: "workorders.read", group: "production", description: "Gestión de órdenes de trabajo" },
  { href: "/control", label: "Control de Producción", icon: "Activity", requiredPerm: "production.read", group: "production", description: "Monitoreo en tiempo real" },
  { href: "/maquinas", label: "Máquinas", icon: "Cog", requiredPerm: "machines.read", group: "production", description: "Estado y configuración de máquinas" },
  { href: "/cotizador", label: "Cotizador", icon: "Calculator", requiredPerm: "quotes.read", group: "sales", description: "Herramienta de cotización", isNew: true },
  { href: "/clientes", label: "Clientes", icon: "Users", requiredPerm: "clients.read", group: "sales", description: "Base de datos de clientes" },
  { href: "/inventario", label: "Inventario", icon: "Package", requiredPerm: "inventory.read", group: "purchases", description: "Control de stock y materiales" },
  { href: "/compras", label: "Compras", icon: "ShoppingCart", requiredPerm: "purchases.read", group: "purchases", description: "Gestión de proveedores y compras" },
  { href: "/admin/users", label: "Usuarios", icon: "User", requiredPerm: "roles.read", group: "system", description: "Administración de usuarios" },
  { href: "/admin/roles", label: "Roles", icon: "Shield", requiredPerm: "roles.read", group: "system", description: "Gestión de roles del sistema" },
  { href: "/admin/permissions", label: "Permisos", icon: "KeyRound", requiredPerm: "permissions.read", group: "system", description: "Listado y gestión de permisos" },
  { href: "/admin/role-permissions", label: "Roles ↔ Permisos", icon: "Link2", requiredPerm: "roles.read", group: "system", description: "Asignación de permisos por rol" },
  { href: "/admin/parametros", label: "Parámetros", icon: "Settings", requiredPerm: "settings.costing.read", group: "system", description: "Configuración y parámetros del sistema" },
];

async function getItemBadges(item: NavItem & { requiredPerm?: string; group?: string }) {
  switch (item.href) {
    case "/ot":
      break;
    case "/control":
      break;
  }
  return item.badge;
}

async function getUserWithStatus(user: SidebarUser) {
  return {
    ...user,
    status: "online" as const,
    notificationCount: 0,
    role: "Administrador",
  };
}

export default async function SidebarNavServer() {
  const me = await getCurrentUser();
  if (!me) return null;

  const permSet = await getUserPermissionSet(me.email);

  const allowed = allNavItems
    .filter((item) => !item.requiredPerm || permSet.has(item.requiredPerm))
    .map(({ href, label, icon, group, description, isNew, badge }) => ({ href, label, icon, group, description, isNew, badge })) as (NavItem & { group?: string })[];

  const itemsWithBadges = await Promise.all(
    allowed.map(async (item) => ({ ...item, badge: await getItemBadges(item) }))
  );

  const groups = {
    dashboard: { name: "Panel Principal", items: [] as NavItem[], icon: "Home" as const, order: 1, isCollapsible: false },
    production: { name: "Producción", items: [] as NavItem[], icon: "Factory" as const, order: 2, isCollapsible: true },
    sales: { name: "Ventas", items: [] as NavItem[], icon: "TrendingUp" as const, order: 3, isCollapsible: true },
    purchases: { name: "Compras", items: [] as NavItem[], icon: "ShoppingBag" as const, order: 4, isCollapsible: true },
    system: { name: "Sistema", items: [] as NavItem[], icon: "Settings2" as const, order: 5, isCollapsible: true },
  };

  for (const item of itemsWithBadges) {
    const groupKey = item.group || "dashboard";
    if (groups[groupKey as keyof typeof groups]) {
      groups[groupKey as keyof typeof groups].items.push({ href: item.href, label: item.label, icon: item.icon, description: item.description, isNew: item.isNew, badge: item.badge });
    }
  }

  const groupedOutput: NavGroup[] = Object.values(groups)
    .filter((group) => group.items.length > 0)
    .sort((a, b) => a.order - b.order)
    .map((group) => ({ group: group.name, items: group.items, groupIcon: group.icon, isCollapsible: group.isCollapsible }));

  const userImage = (me as { image?: string | null }).image ?? null;
  const userName = (me as { name?: string | null }).name ?? me.email;

  const userWithStatus = await getUserWithStatus({ name: userName, email: me.email, image: userImage });

  return <SidebarNavClient items={groupedOutput} brand="TornoApp" user={userWithStatus} />;
}