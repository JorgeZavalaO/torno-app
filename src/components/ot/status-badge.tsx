import { Badge } from "@/components/ui/badge";

export type EstadoOT = "DRAFT"|"OPEN"|"IN_PROGRESS"|"DONE"|"CANCELLED";

const config: Record<EstadoOT, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
  OPEN: { label: "Abierta", className: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "En Proceso", className: "bg-indigo-100 text-indigo-800" },
  DONE: { label: "Terminada", className: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelada", className: "bg-red-100 text-red-800" },
};

export function StatusBadge({ estado }: { estado: EstadoOT }) {
  const { label, className } = config[estado];
  return <Badge className={className}>{label}</Badge>;
}
