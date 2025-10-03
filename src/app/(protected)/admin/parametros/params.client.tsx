"use client";

import React, { useMemo, useState, useTransition, useCallback, startTransition } from "react";
import type { LucideIcon } from "lucide-react";
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
  Settings,
  BarChart3,
  Coins
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

const GROUP_ICONS: Record<string, LucideIcon> = {
  general: Settings,
  margenes: BarChart3,
  costos: Coins,
  costos_compartidos: Settings,
};



const formatGroupName = (group: string) =>
  group
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

export default function ParamsClient({
  initialItems, 
  canWrite, 
  actions,
  monedaOptions = [],
  tipoCambio = 3.5
}: {
  initialItems: Item[];
  canWrite: boolean;
  actions: Actions;
  monedaOptions?: MonedaOption[];
  tipoCambio?: number;
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
    const collection = new Map<string, { original: string; items: ItemWithUI[] }>();

    for (const it of items) {
      const originalGroup = it.group ?? "general";
      const key = originalGroup.toLowerCase();

      if (!collection.has(key)) {
        collection.set(key, { original: originalGroup, items: [] });
      }

      collection.get(key)!.items.push(it);
    }

    for (const groupData of collection.values()) {
      groupData.items.sort((a, b) => a.key.localeCompare(b.key));
    }

    return collection;
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
      <div className="space-y-6">
        {/* Simple Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Parámetros</h3>
            <span className="text-xs text-muted-foreground">{groups.size} grupos, {monedaOptions.length} monedas</span>
          </div>
          
          {canWrite && (
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetDialog(true)}
                    disabled={pending}
                  >
                    <RotateCcw className="h-4 w-4" />
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
                      size="lg"
                      className="bg-white text-blue-600 hover:bg-white/90 font-semibold shadow-lg"
                    >
                      {pending ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-5 w-5 mr-2" />
                      )}
                      {pending ? "Guardando..." : `Guardar cambios`}
                      {changedItemsCount > 0 && (
                        <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600">
                          {changedItemsCount}
                        </Badge>
                      )}
                  </Button>
                </div>
              )}
          </div>

        {/* Status Alerts */}
          {hasChanges && (
            <Alert className="bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 shadow-sm">
              <Info className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
                Tienes cambios sin guardar en {changedItemsCount} parámetro{changedItemsCount !== 1 ? 's' : ''}.
                {hasInvalidValues && " Corrige los errores antes de guardar."}
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Alert */}
          {!canWrite && (
            <Alert variant="destructive" className="shadow-sm">
              <Info className="h-5 w-5" />
              <AlertDescription className="font-medium">
                Solo tienes permisos de lectura. No puedes modificar los parámetros.
              </AlertDescription>
            </Alert>
          )}

        {/* Parameter Groups */}
        {[...groups.entries()].map(([groupKey, { original, items: groupItems }]) => {
          const IconComponent = GROUP_ICONS[groupKey] ?? Settings;
          const groupLabel = formatGroupName(original);

          return (
            <Card key={groupKey} className="border-slate-200/60 bg-slate-50/30 dark:border-slate-700/60 dark:bg-slate-900/30">
              <div className="p-5 border-b border-slate-200/60 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg dark:bg-slate-800">
                    <IconComponent className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{groupLabel}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{groupItems.length} parámetros</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {groupItems.map((item) => (
                    <ParameterField
                      key={item.id}
                      item={item}
                      currency={String(currentCurrency)}
                      tipoCambio={tipoCambio}
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

        {/* Simple Reset Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Restablecer valores?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción sobrescribirá todos los parámetros con los valores predeterminados. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={doReset} 
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  "Restablecer"
                )}
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
  tipoCambio = 3.5, // eslint-disable-line @typescript-eslint/no-unused-vars
  canWrite,
  onChange,
  onSave,
  monedaOptions = []
}: {
  item: ItemWithUI;
  currency?: string;
  tipoCambio?: number;
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

  // Professional card design for all parameter types
  const CardWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className={`p-4 border rounded-lg bg-white dark:bg-slate-900 transition-all duration-200 
      ${item.hasChanges 
        ? 'border-blue-300 dark:border-blue-600 shadow-blue-100 dark:shadow-blue-900/20 shadow-lg' 
        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div>
              <Label htmlFor={item.key} className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {label}
              </Label>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600">
                  {item.type}
                </Badge>
                {item.hasChanges && (
                  <Badge className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                    Modificado
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {!item.isValid && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
        {children}
      </div>
    </div>
  );

  if (item.type === "TEXT") {
    // Special case for currency field - use Select with catalog options
    if (item.key === "currency" && monedaOptions.length > 0) {
      return (
        <CardWrapper>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Select
                value={String(item.uiValue ?? "")}
                onValueChange={(value) => onChange(value)}
                disabled={!canWrite}
              >
                <SelectTrigger className={`h-12 transition-colors ${
                  !item.isValid 
                    ? "border-red-300 dark:border-red-600 text-red-700 dark:text-red-300" 
                    : item.hasChanges 
                    ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950" 
                    : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monedaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                      size="lg"
                      onClick={handleSave} 
                      disabled={pending}
                      className="h-12 px-4 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-300 transition-colors"
                    >
                      {pending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                    Guardar cambio
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            {!item.isValid && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 font-medium bg-red-50 dark:bg-red-950/50 p-2 rounded border border-red-200 dark:border-red-800">
                <XCircle className="h-4 w-4" />
                {item.validationMessage}
              </p>
            )}
            
            {item.unit && (
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-center">
                Formato: <span className="font-medium">{item.unit}</span>
              </p>
            )}
          </div>
        </CardWrapper>
      );
    }

    // Regular TEXT field
    return (
      <CardWrapper>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Input
              id={item.key}
              value={String(item.uiValue ?? "")}
              onChange={(e) => onChange(e.target.value)}
              disabled={!canWrite}
              className={`h-12 transition-colors ${
                !item.isValid 
                  ? "border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950" 
                  : item.hasChanges 
                  ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950" 
                  : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
              }`}
            />
            {canWrite && item.hasChanges && item.isValid && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleSave} 
                    disabled={pending}
                    className="h-12 px-4 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-300 transition-colors"
                  >
                    {pending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                  Guardar cambio
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {!item.isValid && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 font-medium bg-red-50 dark:bg-red-950/50 p-2 rounded border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4" />
              {item.validationMessage}
            </p>
          )}
          
          {item.unit && (
            <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-center">
              Formato: <span className="font-medium">{item.unit}</span>
            </p>
          )}
        </div>
      </CardWrapper>
    );
  }

  // NUMBER / CURRENCY / PERCENT
  const step = item.type === "PERCENT" ? "0.01" : "0.01";
  const suffix = item.type === "PERCENT" ? "%" : (item.type === "CURRENCY" ? (currency ?? (item.unit?.split("/")[0] || "")) : (item.unit?.split("/")[0] || ""));

  return (
    <CardWrapper>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Input
              id={item.key}
              type="number"
              step={step}
              value={Number(item.uiValue ?? 0)}
              onChange={(e) => onChange(Number(e.target.value))}
              disabled={!canWrite}
              className={`h-12 pr-16 font-mono text-lg transition-colors ${
                !item.isValid 
                  ? "border-red-300 dark:border-red-600 focus-visible:ring-red-500 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950" 
                  : item.hasChanges 
                  ? "border-blue-300 dark:border-blue-600 focus-visible:ring-blue-500 bg-blue-50 dark:bg-blue-950" 
                  : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus-visible:ring-slate-500"
              }`}
            />
            {suffix && (
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold transition-colors ${
                item.type === "PERCENT" 
                  ? "text-blue-600 dark:text-blue-400" 
                  : item.type === "CURRENCY" 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-slate-500 dark:text-slate-400"
              }`}>
                {suffix}
              </span>
            )}
          </div>
          
          {canWrite && item.hasChanges && item.isValid && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleSave} 
                  disabled={pending}
                  className="h-12 px-4 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-300 transition-colors"
                >
                  {pending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                Guardar cambio
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {!item.isValid && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 font-medium bg-red-50 dark:bg-red-950/50 p-2 rounded border border-red-200 dark:border-red-800">
            <XCircle className="h-4 w-4" />
            {item.validationMessage}
          </p>
        )}
        
        {item.unit && (
          <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-center">
            Unidad: <span className="font-medium">{item.unit}</span>
          </p>
        )}
      </div>
    </CardWrapper>
  );
}