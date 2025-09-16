"use client";

import { useMemo, useState, useTransition, useCallback, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Loader2,
  AlertTriangle,
  Settings,
  Globe,
  Percent,
  DollarSign,
  Hash,
  Type,
  TrendingUp
} from "lucide-react";

type Item = {
  id: string;
  key: string;
  label: string | null;
  group: string | null;
  type: "NUMBER" | "PERCENT" | "CURRENCY" | "TEXT";
  valueNumber: string | null;
  valueText: string | null;
  unit: string | null;
};

type MonedaOption = {
  value: string;
  label: string;
  color: string | null;
  icono: string | null;
  descripcion: string | null;
};

type Actions = {
  bulkUpdate: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  resetDefaults: () => Promise<{ ok: boolean; message?: string }>;
  updateOne: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
};

type ItemWithUI = Item & { 
  uiValue: number | string; 
  hasChanges: boolean;
  isValid: boolean;
  validationMessage?: string;
};

const GROUP_ICONS = {
  general: Globe,
  margenes: TrendingUp,
  costos: DollarSign,
} as const;

const PARAM_TYPE_ICONS = {
  NUMBER: Hash,
  PERCENT: Percent,
  CURRENCY: DollarSign,
  TEXT: Type,
} as const;

const PARAM_TYPE_COLORS = {
  NUMBER: "text-blue-600",
  PERCENT: "text-green-600", 
  CURRENCY: "text-amber-600",
  TEXT: "text-purple-600",
} as const;

const GROUP_DESCRIPTIONS = {
  general: "Configuración básica del sistema",
  margenes: "Porcentajes de gastos y utilidades",
  costos: "Tarifas y costos operativos",
} as const;

export default function ParamsClient({
  initialItems, 
  canWrite, 
  actions,
  monedaOptions = []
}: {
  initialItems: Item[];
  canWrite: boolean;
  actions: Actions;
  monedaOptions?: MonedaOption[];
}) {
  const [items, setItems] = useState<ItemWithUI[]>(() =>
    initialItems.map(i => ({
      ...i,
      uiValue: i.type === "PERCENT"
        ? Number(i.valueNumber ?? 0) * 100
        : i.type === "TEXT"
          ? (i.valueText ?? "")
          : Number(i.valueNumber ?? 0),
      hasChanges: false,
      isValid: true,
    }))
  );

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  // Validación en tiempo real
  const validateValue = useCallback((type: string, value: number | string): { isValid: boolean; message?: string } => {
    if (type === "TEXT") {
      const str = String(value).trim();
      if (!str) return { isValid: false, message: "El campo no puede estar vacío" };
      return { isValid: true };
    }

    const num = Number(value);
    if (isNaN(num)) return { isValid: false, message: "Debe ser un número válido" };
    
    if (type === "PERCENT") {
      if (num < 0 || num > 100) return { isValid: false, message: "Debe estar entre 0 y 100" };
    } else if (type === "CURRENCY" || type === "NUMBER") {
      if (num < 0) return { isValid: false, message: "No puede ser negativo" };
    }

    return { isValid: true };
  }, []);

  const updateItem = useCallback((id: string, newValue: number | string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const validation = validateValue(item.type, newValue);
      const originalValue = item.type === "PERCENT"
        ? Number(item.valueNumber ?? 0) * 100
        : item.type === "TEXT"
          ? (item.valueText ?? "")
          : Number(item.valueNumber ?? 0);
      
      return {
        ...item,
        uiValue: newValue,
        hasChanges: newValue !== originalValue,
        isValid: validation.isValid,
        validationMessage: validation.message,
      };
    }));
  }, [validateValue]);

  // Detectar moneda actual seleccionada (si existe)
  const currentCurrency = items.find(i => i.key === "currency")?.uiValue ?? "PEN";

  const groups = useMemo(() => {
    const g = new Map<string, ItemWithUI[]>();
    for (const it of items) {
      const k = it.group ?? "general";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(it);
    }
    for (const [k, arr] of g) {
      g.set(k, arr.slice().sort((a, b) => a.key.localeCompare(b.key)));
    }
    return g;
  }, [items]);

  const hasChanges = items.some(item => item.hasChanges);
  const hasInvalidValues = items.some(item => !item.isValid);
  const changedItemsCount = items.filter(item => item.hasChanges).length;

  const saveAll = () => {
    if (!canWrite || hasInvalidValues) return;
    
    const changedItems = items.filter(item => item.hasChanges);
    const payload = {
      items: changedItems.map((i) => ({
        key: i.key,
        type: i.type,
        value: i.type === "TEXT" ? String(i.uiValue ?? "") : Number(i.uiValue ?? 0),
      })),
    };
    
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    
    start(async () => {
      const res = await actions.bulkUpdate(fd);
      if (res.ok) {
        toast.success(res.message ?? "Cambios guardados correctamente");
        // Marcar elementos como guardados
        setItems(prev => prev.map(item => ({
          ...item,
          hasChanges: false,
        })));
      } else {
        toast.error(res.message ?? "Error al guardar");
      }
    });
  };

  const doReset = () => {
    start(async () => {
      const res = await actions.resetDefaults();
      if (res.ok) {
        toast.success(res.message ?? "Valores restablecidos");
        startTransition(() => router.refresh());
      } else {
        toast.error(res.message ?? "Error al restablecer");
      }
      setShowResetDialog(false);
    });
  };

  const saveOne = async (item: ItemWithUI) => {
    if (!canWrite || !item.isValid) return;
    
    const fd = new FormData();
    fd.set("key", item.key);
    fd.set("type", item.type);
    fd.set("value", String(item.uiValue ?? ""));
    
    const res = await actions.updateOne(fd);
    if (res.ok) {
      toast.success("Parámetro guardado");
      setItems(prev => prev.map(p => 
        p.id === item.id ? { ...p, hasChanges: false } : p
      ));
    } else {
      toast.error(res.message ?? "Error al guardar");
    }
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              <Settings className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Parámetros del Sistema
              </h1>
              <p className="text-base text-muted-foreground">
                Configura las tarifas, márgenes y parámetros de cotización del taller
              </p>
              {/* Debug: mostrar cuántas opciones de moneda se pasaron desde el servidor */}
              <p className="text-sm text-muted-foreground mt-1">Monedas en catálogo: {monedaOptions.length}</p>
            </div>
          </div>
          
          {canWrite && (
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowResetDialog(true)}
                    disabled={pending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restablecer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Restablecer todos los valores a los predeterminados
                </TooltipContent>
              </Tooltip>
              
              <Button 
                onClick={saveAll} 
                disabled={pending || !hasChanges || hasInvalidValues}
                className="relative"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {pending ? "Guardando..." : `Guardar cambios`}
                {changedItemsCount > 0 && (
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                    {changedItemsCount}
                  </Badge>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Status Alerts */}
        {hasChanges && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tienes cambios sin guardar en {changedItemsCount} parámetro{changedItemsCount !== 1 ? 's' : ''}.
              {hasInvalidValues && " Corrige los errores antes de guardar."}
            </AlertDescription>
          </Alert>
        )}

        {/* Permission Alert */}
        {!canWrite && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Solo tienes permisos de lectura. No puedes modificar los parámetros.
            </AlertDescription>
          </Alert>
        )}

        {/* Parameter Groups */}
        {[...groups.entries()].map(([group, arr]) => {
          const IconComponent = GROUP_ICONS[group as keyof typeof GROUP_ICONS];
          
          return (
            <Card key={group} className="overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg capitalize">{group}</h3>
                    <p className="text-sm text-muted-foreground">
                      {GROUP_DESCRIPTIONS[group as keyof typeof GROUP_DESCRIPTIONS] || "Configuración del sistema"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {arr.map((item) => (
                    <ParameterField
                      key={item.id}
                      item={item}
                      currency={String(currentCurrency)}
                      canWrite={canWrite}
                      onChange={(v) => updateItem(item.id, v)}
                      onSave={() => saveOne(item)}
                      monedaOptions={monedaOptions}
                    />
                  ))}
              </div>
            </div>
          </Card>
        );
        })}

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Restablecer valores predeterminados?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción sobrescribirá todos los parámetros actuales con los valores predeterminados del sistema.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={doReset} disabled={pending}>
                {pending ? "Restableciendo..." : "Restablecer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

function ParameterField({
  item,
  currency,
  canWrite,
  onChange,
  onSave,
  monedaOptions = []
}: {
  item: ItemWithUI;
  currency?: string;
  canWrite: boolean;
  onChange: (v: number | string) => void;
  onSave: () => Promise<void>;
  monedaOptions?: MonedaOption[];
}) {
  const [pending, start] = useTransition();
  const label = item.label ?? item.key;

  const handleSave = () => {
    if (!item.isValid || !item.hasChanges) return;
    start(async () => {
      await onSave();
    });
  };

  if (item.type === "TEXT") {
    // Special case for currency field - use Select with catalog options
    if (item.key === "currency" && monedaOptions.length > 0) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${PARAM_TYPE_COLORS[item.type]}`}>
                {(() => {
                  const IconComponent = PARAM_TYPE_ICONS[item.type];
                  return <IconComponent className="h-4 w-4" />;
                })()}
              </div>
              <Label htmlFor={item.key} className="text-sm font-medium">
                {label}
              </Label>
            </div>
            {item.hasChanges && (
              <Badge variant="secondary" className="text-xs">
                Modificado
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select
                value={String(item.uiValue ?? "")}
                onValueChange={(value) => onChange(value)}
                disabled={!canWrite}
              >
                <SelectTrigger className={!item.isValid ? "border-destructive" : item.hasChanges ? "border-primary" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monedaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" style={{ color: option.color || "#6B7280" }} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canWrite && item.hasChanges && item.isValid && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleSave} 
                      disabled={pending}
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Guardar cambio</TooltipContent>
                </Tooltip>
              )}
            </div>
            
            {!item.isValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {item.validationMessage}
              </p>
            )}
            
            {item.unit && (
              <p className="text-xs text-muted-foreground">Formato: {item.unit}</p>
            )}
          </div>
        </div>
      );
    }

    // Regular TEXT field
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${PARAM_TYPE_COLORS[item.type]}`}>
              {(() => {
                const IconComponent = PARAM_TYPE_ICONS[item.type];
                return <IconComponent className="h-4 w-4" />;
              })()}
            </div>
            <Label htmlFor={item.key} className="text-sm font-medium">
              {label}
            </Label>
          </div>
          {item.hasChanges && (
            <Badge variant="secondary" className="text-xs">
              Modificado
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id={item.key}
              value={String(item.uiValue ?? "")}
              onChange={(e) => onChange(e.target.value)}
              disabled={!canWrite}
              className={!item.isValid ? "border-destructive" : item.hasChanges ? "border-primary" : ""}
            />
            {canWrite && item.hasChanges && item.isValid && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleSave} 
                    disabled={pending}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Guardar cambio</TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {!item.isValid && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {item.validationMessage}
            </p>
          )}
          
          {item.unit && (
            <p className="text-xs text-muted-foreground">Formato: {item.unit}</p>
          )}
        </div>
      </div>
    );
  }

  // NUMBER / CURRENCY / PERCENT
  const step = item.type === "PERCENT" ? "0.01" : "0.01";
  const suffix = item.type === "PERCENT" ? "%" : (item.type === "CURRENCY" ? (currency ?? (item.unit?.split("/")[0] || "")) : (item.unit?.split("/")[0] || ""));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${PARAM_TYPE_COLORS[item.type]}`}>
            {(() => {
              const IconComponent = PARAM_TYPE_ICONS[item.type];
              return <IconComponent className="h-4 w-4" />;
            })()}
          </div>
          <Label htmlFor={item.key} className="text-sm font-medium">
            {label}
          </Label>
        </div>
        {item.hasChanges && (
          <Badge variant="secondary" className="text-xs">
            Modificado
          </Badge>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={item.key}
              type="number"
              step={step}
              value={Number(item.uiValue ?? 0)}
              onChange={(e) => onChange(Number(e.target.value))}
              disabled={!canWrite}
              className={`pr-12 ${!item.isValid ? "border-destructive" : item.hasChanges ? "border-primary" : ""}`}
            />
            {suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {suffix}
              </span>
            )}
          </div>
          
          {canWrite && item.hasChanges && item.isValid && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleSave} 
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Guardar cambio</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {!item.isValid && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {item.validationMessage}
          </p>
        )}
        
        {item.unit && (
          <p className="text-xs text-muted-foreground">Unidad: {item.unit}</p>
        )}
      </div>
    </div>
  );
}