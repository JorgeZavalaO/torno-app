"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { ProgressBar } from "@/components/ui/progress-bar";
import { PriorityBadge } from "@/components/ot/priority-badge";
import { StatusBadge } from "@/components/ot/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Target,
  X,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WIPRow } from "./types";

interface WIPTableProps {
  wip: WIPRow[];
  onView?: (item: WIPRow) => void;
  onEdit?: (item: WIPRow) => void;
  onDelete?: (item: WIPRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

type SortField = "codigo" | "cliente" | "prioridad" | "avance" | "fecha";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 25;

export function WIPTable({ 
  wip, 
  onView, 
  onEdit, 
  onDelete, 
  onRefresh,
  loading = false 
}: WIPTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("avance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedWIP = useMemo(() => {
    let filtered = wip;

    // Aplicar filtros de texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.codigo.toLowerCase().includes(term) ||
          (item.clienteNombre?.toLowerCase().includes(term))
      );
    }

    // Aplicar filtros de estado
    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.estado === statusFilter);
    }

    // Aplicar filtros de prioridad
    if (priorityFilter !== "all") {
      filtered = filtered.filter(item => item.prioridad === priorityFilter);
    }

    // Aplicar ordenamiento
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;

      switch (sortField) {
        case "codigo":
          aValue = a.codigo;
          bValue = b.codigo;
          break;
        case "cliente":
          aValue = a.clienteNombre || "";
          bValue = b.clienteNombre || "";
          break;
        case "prioridad":
          const priorityOrder = { "URGENT": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
          aValue = priorityOrder[a.prioridad];
          bValue = priorityOrder[b.prioridad];
          break;
        case "avance":
          aValue = a.avancePct;
          bValue = b.avancePct;
          break;
        case "fecha":
          aValue = new Date(a.creadaEn);
          bValue = new Date(b.creadaEn);
          break;
        default:
          aValue = a.avancePct;
          bValue = b.avancePct;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [wip, searchTerm, statusFilter, priorityFilter, sortField, sortDirection]);

  // Paginación
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedWIP.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedWIP, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedWIP.length / ITEMS_PER_PAGE);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  }, [sortField, sortDirection]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = searchTerm || statusFilter !== "all" || priorityFilter !== "all";

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) 
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />;
    return (
      <ArrowUpDown 
        className={`h-3.5 w-3.5 transition-transform duration-200 ${
          sortDirection === "asc" ? "rotate-180" : ""
        } text-primary`} 
      />
    );
  };

  // Estadísticas
  const stats = useMemo(() => {
    const totalProduccion = filteredAndSortedWIP.reduce((sum, item) => sum + item.piezasHechas, 0);
    const totalPlan = filteredAndSortedWIP.reduce((sum, item) => sum + item.piezasPlan, 0);
    const promedioAvance = filteredAndSortedWIP.length > 0 
      ? filteredAndSortedWIP.reduce((sum, item) => sum + item.avancePct, 0) / filteredAndSortedWIP.length 
      : 0;
    
    const enRiesgo = filteredAndSortedWIP.filter(item => item.avancePct < 25).length;
    const completadas = filteredAndSortedWIP.filter(item => item.avancePct === 100).length;
    
    return {
      totalProduccion,
      totalPlan,
      promedioAvance,
      enRiesgo,
      completadas,
      eficiencia: totalPlan > 0 ? (totalProduccion / totalPlan) * 100 : 0
    };
  }, [filteredAndSortedWIP]);

  const getProgressBarClasses = (p: number) => {
    if (p >= 100) return "bg-gradient-to-r from-emerald-500 to-green-500";
    if (p >= 75)  return "bg-gradient-to-r from-blue-500 to-indigo-500";
    if (p >= 50)  return "bg-gradient-to-r from-orange-400 to-amber-500";
    if (p >= 25)  return "bg-gradient-to-r from-yellow-400 to-amber-500";
    return "bg-gradient-to-r from-rose-500 to-red-500";
};
  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return "text-green-600 dark:text-green-400";
    if (percentage >= 75) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 50) return "text-orange-600 dark:text-orange-400";
    if (percentage >= 25) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

//   const getProgressVariant = (percentage: number): "default" | "success" | "warning" | "error" => {
//     if (percentage === 100) return "success";
//     if (percentage < 25) return "error";
//     if (percentage < 50) return "warning";
//     return "default";
//   };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header con estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Órdenes</p>
                <p className="text-2xl font-bold">{filteredAndSortedWIP.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completadas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Riesgo</p>
                <p className="text-2xl font-bold text-red-600">{stats.enRiesgo}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eficiencia</p>
                <p className="text-2xl font-bold">{stats.eficiencia.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Controles de filtrado */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                {/* Búsqueda */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código o cliente..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 transition-all duration-200 focus:ring-2"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Filtros */}
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="OPEN">Abierta</SelectItem>
                      <SelectItem value="IN_PROGRESS">En Proceso</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las prioridades</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="MEDIUM">Media</SelectItem>
                      <SelectItem value="LOW">Baja</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                          className="px-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Limpiar filtros</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Botón de refresh */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {stats.totalProduccion.toLocaleString()}/{stats.totalPlan.toLocaleString()}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.promedioAvance.toFixed(1)}%
                </Badge>
                {onRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    className="px-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Tabla */}
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <TableRow className="bg-muted/40 hover:bg-muted/60">
                    <TableHead className="font-semibold">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort("codigo")}
                        className="h-8 px-2 font-semibold hover:bg-muted transition-colors"
                      >
                        Código {getSortIcon("codigo")}
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort("cliente")}
                        className="h-8 px-2 font-semibold hover:bg-muted transition-colors"
                      >
                        Cliente {getSortIcon("cliente")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center font-semibold">Estado</TableHead>
                    <TableHead className="text-center font-semibold">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort("prioridad")}
                        className="h-8 px-2 font-semibold hover:bg-muted transition-colors"
                      >
                        Prioridad {getSortIcon("prioridad")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right font-semibold">Producido</TableHead>
                    <TableHead className="text-right font-semibold">Plan</TableHead>
                    <TableHead className="text-right font-semibold">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort("avance")}
                        className="h-8 px-2 font-semibold hover:bg-muted transition-colors"
                      >
                        Avance {getSortIcon("avance")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort("fecha")}
                        className="h-8 px-2 font-semibold hover:bg-muted transition-colors"
                      >
                        Creación {getSortIcon("fecha")}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item, index) => (
                    <TableRow 
                      key={item.id} 
                      className="group hover:bg-muted/30 transition-colors duration-200"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <TableCell className="font-mono font-medium">
                        <span className="bg-muted/50 px-2 py-1 rounded text-xs">
                          {item.codigo}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.clienteNombre ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{item.clienteNombre}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Sin cliente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge estado={item.estado} />
                      </TableCell>
                      <TableCell className="text-center">
                        <PriorityBadge prioridad={item.prioridad} />
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        <Tooltip>
                          <TooltipTrigger>
                            {item.piezasHechas.toLocaleString()}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.piezasHechas} piezas producidas</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        <Tooltip>
                          <TooltipTrigger>
                            {item.piezasPlan.toLocaleString()}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.piezasPlan} piezas planificadas</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    <TableCell className="text-right">
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <div className="flex flex-col items-end gap-1.5">
                            {/* Línea superior: % + x/y + badge de pendientes */}
                            <div className="flex items-center gap-2">
                            <span
                                className={`text-sm font-semibold tabular-nums ${getProgressColor(item.avancePct)}`}
                                aria-label={`Avance ${item.avancePct.toFixed(1)} por ciento`}
                            >
                                {item.avancePct.toFixed(1)}%
                            </span>

                            <span className="text-xs text-muted-foreground">
                                {item.piezasHechas.toLocaleString()}/{item.piezasPlan.toLocaleString()}
                            </span>

                            {(() => {
                                const pend = Math.max(0, item.piezasPlan - item.piezasHechas);
                                if (pend === 0) {
                                return (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                    ✔ listo
                                    </span>
                                );
                                }
                                const badgeClass =
                                item.avancePct < 25
                                    ? "bg-red-100 text-red-700"
                                    : item.avancePct < 50
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-700";
                                return (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClass}`}>
                                    {pend.toLocaleString()} pend.
                                </span>
                                );
                            })()}
                            </div>

                            {/* Barra mejorada con marcas 25/50/75 */}
                            <div className="w-28">
                            <div className="relative h-2.5 rounded bg-muted overflow-hidden">
                                <div
                                className={`absolute inset-y-0 left-0 ${getProgressBarClasses(item.avancePct)}`}
                                style={{ width: `${Math.min(100, Math.max(0, item.avancePct))}%` }}
                                />
                                {/* Marcas (25/50/75%) */}
                                <div className="absolute inset-0 pointer-events-none opacity-50">
                                <div className="absolute inset-y-0 left-1/4 w-px bg-border/60" />
                                <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />
                                <div className="absolute inset-y-0 left-3/4 w-px bg-border/60" />
                                </div>
                            </div>
                            </div>
                        </div>
                        </TooltipTrigger>

                        {/* Tooltip con desglose */}
                        <TooltipContent>
                        <div className="text-xs space-y-1">
                            <div><strong>Plan:</strong> {item.piezasPlan.toLocaleString()}</div>
                            <div><strong>Hechas:</strong> {item.piezasHechas.toLocaleString()}</div>
                            <div><strong>Pendientes:</strong> {Math.max(0, item.piezasPlan - item.piezasHechas).toLocaleString()}</div>
                        </div>
                        </TooltipContent>
                    </Tooltip>
                    </TableCell>

                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.creadaEn).toLocaleDateString()}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Creado el {new Date(item.creadaEn).toLocaleDateString('es-ES', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onView && (
                              <DropdownMenuItem onClick={() => onView(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(item)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={() => onDelete(item)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <Filter className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">No se encontraron órdenes</h3>
                            <p className="text-muted-foreground">
                              {hasActiveFilters 
                                ? "Prueba ajustar tus filtros de búsqueda"
                                : "No hay órdenes de trabajo disponibles"
                              }
                            </p>
                            {hasActiveFilters && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={clearFilters}
                                className="mt-2"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Limpiar filtros
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación y resumen */}
            {filteredAndSortedWIP.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedWIP.length)} de{' '}
                  {filteredAndSortedWIP.length} órdenes
                  {filteredAndSortedWIP.length !== wip.length && (
                    <span> (filtrado de {wip.length} total)</span>
                  )}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const page = i + 1;
                        if (totalPages <= 5) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}