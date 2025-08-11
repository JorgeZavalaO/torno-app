import { Badge } from "@/components/ui/badge";
import { Key, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Permission = { 
  id: string; 
  code: string; 
  description?: string | null; 
  createdAt?: Date;
};

// Componente para mostrar el estado de un permiso
export function PermissionStatusBadge({ permission }: { permission: Permission }) {
  const hasDescription = Boolean(permission.description?.trim());
  
  return (
    <Badge 
      variant={hasDescription ? "default" : "secondary"}
      className={cn(
        "text-xs font-medium",
        hasDescription 
          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      )}
    >
      {hasDescription ? "Documentado" : "Sin descripción"}
    </Badge>
  );
}

// Componente para el icono de permiso con estado
export function PermissionIcon({ 
  permission, 
  className = "h-4 w-4" 
}: { 
  permission: Permission; 
  className?: string;
}) {
  const hasDescription = Boolean(permission.description?.trim());
  
  return (
    <div className={cn(
      "flex items-center justify-center rounded-lg",
      hasDescription 
        ? "bg-primary/10 text-primary" 
        : "bg-muted text-muted-foreground",
      className === "h-4 w-4" ? "h-8 w-8" : "h-10 w-10"
    )}>
      <Key className={className} />
    </div>
  );
}

// Componente para mostrar metadatos de un permiso
export function PermissionMetadata({ permission }: { permission: Permission }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Key className="h-3 w-3" />
        <span>ID: {permission.id.slice(0, 8)}...</span>
      </div>
      {permission.createdAt && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>
            Creado: {new Intl.DateTimeFormat('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }).format(new Date(permission.createdAt))}
          </span>
        </div>
      )}
    </div>
  );
}

// Componente para estadísticas rápidas
export function PermissionStats({ 
  permissions 
}: { 
  permissions: Permission[];
}) {
  const total = permissions.length;
  const documented = permissions.filter(p => p.description?.trim()).length;
  const undocumented = total - documented;
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-medium">{total}</span>
        <span className="text-muted-foreground text-sm">total</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="font-medium">{documented}</span>
        <span className="text-muted-foreground text-sm">documentados</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border">
        <div className="h-2 w-2 rounded-full bg-orange-500" />
        <span className="font-medium">{undocumented}</span>
        <span className="text-muted-foreground text-sm">sin documentar</span>
      </div>
    </div>
  );
}

// Componente para mensaje de estado vacío
export function EmptyState({ 
  hasQuery, 
  query 
}: { 
  hasQuery: boolean; 
  query?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
        <Key className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-3 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">
          {hasQuery ? "No hay coincidencias" : "Sin permisos configurados"}
        </h3>
        <p className="text-muted-foreground">
          {hasQuery 
            ? `No se encontraron permisos que coincidan con "${query}". Intenta ajustar tu búsqueda o crear un nuevo permiso.`
            : "Comienza creando el primer permiso del sistema para controlar el acceso a las funcionalidades."
          }
        </p>
      </div>
    </div>
  );
}
