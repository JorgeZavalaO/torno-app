"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Settings, Wrench, BarChart3, Users } from "lucide-react";
import CategoriesClient from "./categories.client";
import ParamsClient from "./params.client";

type Category = {
  id: string;
  categoria: string;
  laborCost: string;
  deprPerHour: string;
  descripcion: string | null;
  activo: boolean;
  machineCount?: number;
};

type ParamItem = {
  id: string;
  key: string;
  label: string | null;
  group: string | null;
  type: "NUMBER" | "PERCENT" | "CURRENCY" | "TEXT";
  valueNumber: string | null;
  valueText: string | null;
  unit: string | null;
};

type CategoryActions = {
  upsert: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  delete: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  sync: () => Promise<{ ok: boolean; message?: string; created?: number }>;
};

type ParamActions = {
  bulkUpdate: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  resetDefaults: () => Promise<{ ok: boolean; message?: string }>;
  updateOne: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function TabsSection({
  mappedCategories,
  mappedParams,
  canWrite,
  tipoCambio,
  categoryActions,
  paramActions,
  monedaOptions,
}: {
  mappedCategories: Category[];
  mappedParams: ParamItem[];
  canWrite: boolean;
  tipoCambio: number;
  categoryActions: CategoryActions;
  paramActions: ParamActions;
  monedaOptions: Array<{ value: string; label: string; color: string | null; icono: string | null; descripcion: string | null }>;
}) {
  return (
    <TooltipProvider>
      <Tabs defaultValue="categories" className="space-y-0">
        <div className="flex flex-col gap-0">
          <TabsList className="flex gap-1 border-b border-border/40 bg-transparent p-0 h-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="categories"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-slate-600 data-[state=active]:bg-slate-50 data-[state=active]:text-slate-700 text-slate-500 hover:text-slate-600 hover:bg-slate-50/50 rounded-none transition-colors duration-200 dark:data-[state=active]:border-slate-400 dark:data-[state=active]:bg-slate-800/50 dark:data-[state=active]:text-slate-200 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  <Wrench className="h-4 w-4" />
                  Categorías
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-slate-50 border-slate-700">
                <p className="text-sm">Configura costos por tipo de máquina</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="params"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-slate-600 data-[state=active]:bg-slate-50 data-[state=active]:text-slate-700 text-slate-500 hover:text-slate-600 hover:bg-slate-50/50 rounded-none transition-colors duration-200 dark:data-[state=active]:border-slate-400 dark:data-[state=active]:bg-slate-800/50 dark:data-[state=active]:text-slate-200 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  <Settings className="h-4 w-4" />
                  Parámetros
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-slate-50 border-slate-700">
                <p className="text-sm">Configura parámetros globales del sistema</p>
              </TooltipContent>
            </Tooltip>
          </TabsList>
          <div className="flex gap-6 mt-3 pb-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{mappedCategories.filter(c => c.activo).length}</span>
              <span>categorías</span>
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">{mappedParams.length}</span>
              <span>parámetros</span>
            </span>
          </div>
        </div>
        <TabsContent value="categories">
          <CategoriesClient
            categories={mappedCategories}
            canWrite={canWrite}
            actions={categoryActions}
            tipoCambio={tipoCambio}
          />
        </TabsContent>
        <TabsContent value="params">
          <ParamsClient
            initialItems={mappedParams}
            canWrite={canWrite}
            actions={paramActions}
            monedaOptions={monedaOptions}
            tipoCambio={tipoCambio}
          />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}
