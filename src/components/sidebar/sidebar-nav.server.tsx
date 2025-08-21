import { getCurrentUser } from "@/app/lib/auth";
import SidebarNavClient, { NavItem } from "./sidebar-nav.client";
import { getUserPermissionSet } from "@/app/lib/rbac";

const allNavItems: (NavItem & { requiredPerm?: string })[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "Usuarios", icon: "Users", requiredPerm: "roles.read" },
  { href: "/admin/roles", label: "Roles", icon: "Shield", requiredPerm: "roles.read" },
  { href: "/admin/permissions", label: "Permisos", icon: "Key", requiredPerm: "permissions.read" },
  { href: "/admin/role-permissions", label: "role-permissions", icon: "Key", requiredPerm: "permissions.read" },
  { href: "/admin/parametros", label: "Parámetros", icon: "Sliders", requiredPerm: "settings.costing.read" },
  { href: "/cotizador", label: "Cotizador", icon: "Calculator", requiredPerm: "quotes.read" },
  { href: "/ot", label: "Órdenes de Trabajo", icon: "ClipboardList", requiredPerm: "workorders.read" },
  { href: "/clientes", label: "Clientes", icon: "Users2", requiredPerm: "clients.read" },
  { href: "/inventario", label: "Inventario", icon: "Package", requiredPerm: "inventory.read" },
  { href: "/compras", label: "Compras", icon: "ShoppingCart", requiredPerm: "purchases.read" },
  { href: "/control", label: "Control Producción", icon: "Factory", requiredPerm: "production.read" },
  { href: "/maquinas", label: "Máquinas", icon: "Wrench", requiredPerm: "machines.read" },
];

export default async function SidebarNavServer() {
  const me = await getCurrentUser();
  if (!me) return null;

  const permSet = await getUserPermissionSet(me.email);

  const allowed = allNavItems
    .filter((item) => !item.requiredPerm || permSet.has(item.requiredPerm))
    .map(({ href, label, icon }) => ({ href, label, icon })) as NavItem[];

  const groups: Record<string, NavItem[]> = {};
  const solo: NavItem[] = [];

  const inferGroup = (it: NavItem) => {
    const h = it.href.toLowerCase();
    if (h.startsWith("/admin") || /admin|roles|permissions|users|parametros/.test(h)) return "Administración";
    if (h.startsWith("/ot") || /workorders|ot/.test(h)) return "Órdenes";
    if (h.startsWith("/compras") || /compras|providers|purchase|oc|sc/.test(h)) return "Compras";
    if (h.startsWith("/inventario") || /inventario|inventory|stock/.test(h)) return "Inventario";
    if (h.startsWith("/cotizador") || /cotiz|quotes/.test(h)) return "Cotizador";
    if (h.startsWith("/clientes") || /clientes|clients/.test(h)) return "Clientes";
    if (h.startsWith("/control") || /control|production|kpi/.test(h)) return "Control";
    if (h.startsWith("/maquinas") || /maquina|machines|machine/.test(h)) return "Máquinas";
    if (h === "/dashboard") return "General";
    return "";
  };

  for (const it of allowed) {
    const g = inferGroup(it);
    if (!g) {
      solo.push(it);
    } else {
      groups[g] = groups[g] || [];
      groups[g].push(it);
    }
  }

  const orderedGroupNames = ["General", "Administración", "Órdenes", "Cotizador", "Clientes", "Inventario", "Compras", "Control", "Máquinas"];
  const groupedOutput: Array<NavItem | { group: string; items: NavItem[] }> = [];

  for (const s of solo) groupedOutput.push(s);
  for (const name of orderedGroupNames) {
    if (groups[name]?.length) groupedOutput.push({ group: name, items: groups[name] });
  }
  for (const [name, items] of Object.entries(groups)) {
    if (!orderedGroupNames.includes(name)) groupedOutput.push({ group: name, items });
  }

  const userImage = (me as { image?: string | null }).image ?? null;
  const userName = (me as { name?: string | null }).name ?? me.email;

  return (
    <SidebarNavClient
      items={groupedOutput}
      brand="TornoApp"
      user={{ name: userName, email: me.email, image: userImage }}
    />
  );
}
