"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type OTItem = {
  id: string;
  codigo: string;
  estado: "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED";
  prioridad: "LOW"|"MEDIUM"|"HIGH"|"URGENT";
  clienteNombre: string | null;
  fechaLimite: string; // ISO string
  horasTrab?: number;
  piezasPend?: number;
  progresoPiezas?: number; // 0..1
};

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Solo vista semanal: utilidades para fechas sin problemas de zona horaria
function parseYMD(ymd: string) {
  // ymd esperado: YYYY-MM-DD (interpretado como local)
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function formatYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDay(date: Date) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dayName = date.toLocaleDateString("es-ES", { weekday: "short" });
  const dayNumber = date.getDate();
  
  return { dayName, dayNumber, isToday };
}

function getPriorityColor(prioridad: string) {
  switch (prioridad) {
    case "URGENT": return "border-l-red-400";
    case "HIGH": return "border-l-orange-400"; 
    case "MEDIUM": return "border-l-yellow-400";
    default: return "border-l-gray-300";
  }
}

function statusChipClass(estado: string) {
  switch (estado) {
    case "DONE": return "bg-green-50 text-green-700 border border-green-200";
    case "IN_PROGRESS": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "OPEN": return "bg-violet-50 text-violet-700 border border-violet-200";
    case "CANCELLED": return "bg-gray-50 text-gray-600 border border-gray-200";
    default: return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

function priorityChipClass(prioridad: string) {
  switch (prioridad) {
    case "URGENT": return "bg-red-50 text-red-700 border border-red-200";
    case "HIGH": return "bg-orange-50 text-orange-700 border border-orange-200";
    case "MEDIUM": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    default: return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

export default function ProgramacionClient({ items }: { items: OTItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // Base semanal (param w en formato YYYY-MM-DD, interpretado local)
  const wParam = search?.get("w");
  const base = useMemo(() => {
    if (wParam) {
      const d = parseYMD(wParam);
      if (!isNaN(d.getTime())) return startOfWeek(d);
    }
    return startOfWeek(new Date());
  }, [wParam]);
  
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(base, i)), [base]);

  const buckets = useMemo(() => {
    const m = new Map<string, OTItem[]>();
    for (const d of days) m.set(d.toDateString(), []);
    for (const ot of items.filter(i => !!i.fechaLimite)) {
      const d = new Date(ot.fechaLimite);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(ot);
    }
    return m;
  }, [days, items]);

  function navigate(direction: "prev" | "next" | "today") {
    const params = new URLSearchParams(search?.toString() || "");
    if (direction === "today") {
      params.delete("w");
    } else {
      const newDate = direction === "prev" ? addDays(base, -7) : addDays(base, 7);
      params.set("w", formatYMD(newDate));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const weekRange = `${base.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} - ${addDays(base, 6).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;

  return (
    <div className="space-y-6">
      {/* Header navegación estilo moderno */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {base.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase()}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {weekRange} • {items.length} órdenes programadas
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Solo vista semanal (controles simplificados) */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button variant="ghost" size="sm" className="text-xs px-3 py-1.5 bg-white shadow-sm" disabled>
                Semanal
              </Button>
            </div>
            
            {/* Navegación */}
            <div className="flex items-center space-x-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => navigate("prev")}
                className="w-8 h-8 p-0 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => navigate("today")}
                className="px-3 text-xs font-medium"
              >
                Hoy
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => navigate("next")}
                className="w-8 h-8 p-0 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Vista del calendario */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-h-[70vh] overflow-y-auto">
        {/* Header días de la semana */}
        <div className="grid grid-cols-7 border-b border-gray-200 sticky top-0 z-10">
          {days.map((day) => {
            const dayInfo = formatDay(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-4 text-center border-r border-gray-200 last:border-r-0",
                  dayInfo.isToday ? "bg-blue-50" : "bg-gray-50"
                )}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {dayInfo.dayName}
                </div>
                <div className={cn(
                  "text-lg font-semibold",
                  dayInfo.isToday ? "text-blue-600" : "text-gray-900"
                )}>
                  {dayInfo.dayNumber}
                </div>
                {dayInfo.isToday && (
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto mt-1"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grid días con contenido */}
        <div className="grid grid-cols-7" style={{ minHeight: "500px" }}>
          {days.map((day) => {
            const list = ((buckets.get(day.toDateString()) as OTItem[]) || [])
              .sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-r border-gray-200 last:border-r-0 min-h-[120px] relative"
                )}
              >
                {/* Contenido del día */}
                <div className="p-3 space-y-2">
                  {list.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Sin trabajos</p>
                      </div>
                    </div>
                  ) : (
                    list.map((ot) => {
                      const time = new Date(ot.fechaLimite).toLocaleTimeString("es-ES", { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      });
                      const isOverdue = new Date(ot.fechaLimite).getTime() < Date.now() && ot.estado !== "DONE";

                      // Ejemplo: botón para refrescar tras acción (puedes reemplazarlo por tu acción real)
                      // Llama a handleOTAction() después de una acción real sobre la OT
                      return (
                        <Tooltip key={ot.id} delayDuration={150}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "relative overflow-visible rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow-md",
                                "border-l-4",
                                getPriorityColor(ot.prioridad)
                              )}
                            >
                              {/* Header: código + estado */}
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <Link 
                                  href={`/ot/${ot.id}`}
                                  className="text-[13px] font-semibold text-blue-600 hover:text-blue-800"
                                  title={`Abrir OT ${ot.codigo}`}
                                >
                                  {ot.codigo}
                                </Link>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", statusChipClass(ot.estado))}>
                                  {ot.estado}
                                </span>
                              </div>

                              {/* Cliente */}
                              <div className="mb-2 flex items-center gap-2 text-[12px] text-gray-600">
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate" title={ot.clienteNombre || "Sin cliente"}>
                                  {ot.clienteNombre || "Sin cliente"}
                                </span>
                              </div>

                              {/* Meta: hora + badges */}
                              <div className="mt-1 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="text-[12px]">{time}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                  {isOverdue && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                                      Atrasada
                                    </span>
                                  )}
                                  <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium", priorityChipClass(ot.prioridad))}>
                                    {ot.prioridad}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="center" sideOffset={12} className="max-w-72">
                            <div className="text-[13px] font-semibold mb-1">{ot.codigo}</div>
                            <div className="mb-2 flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" /> {ot.clienteNombre || "Sin cliente"}</div>
                            {typeof ot.horasTrab === "number" && (
                              <div className="mb-1">Horas trabajadas: <strong>{ot.horasTrab.toFixed(1)}</strong> h</div>
                            )}
                            {typeof ot.piezasPend === "number" && (
                              <div className="mb-1">Piezas pendientes: <strong>{Math.max(0, ot.piezasPend)}</strong></div>
                            )}
                            {typeof ot.progresoPiezas === "number" && (
                              <div className="mb-1">Avance piezas: <strong>{Math.round((ot.progresoPiezas || 0) * 100)}%</strong></div>
                            )}
                            <div className="mt-1">Fecha límite: {new Date(ot.fechaLimite).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
