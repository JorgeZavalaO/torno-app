import { Badge } from "@/components/ui/badge";

export type Prioridad = "LOW"|"MEDIUM"|"HIGH"|"URGENT";

const config: Record<Prioridad, { label: string; className: string }> = {
  LOW: { label: "Baja", className: "bg-gray-100 text-gray-800" },
  MEDIUM: { label: "Media", className: "bg-blue-100 text-blue-800" },
  HIGH: { label: "Alta", className: "bg-yellow-100 text-yellow-800" },
  URGENT: { label: "Urgente", className: "bg-red-100 text-red-800" },
};

export function PriorityBadge({ prioridad }: { prioridad: Prioridad }) {
  const { label, className } = config[prioridad];
  return <Badge className={className}>{label}</Badge>;
}
