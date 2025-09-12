"use client";
import { Badge } from "@/components/ui/badge";
import type { OCRow, SCRow } from "./types";

export function SCBadge({ estado, options }: { estado: SCRow["estado"]; options?: { value: string; label: string; color?: string | null }[] }) {
  const conf: Record<SCRow["estado"], { label: string; className: string }> = {
    PENDING_ADMIN: { label: "Pend. Admin", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
    PENDING_GERENCIA: { label: "Pend. Gerencia", className: "bg-amber-100 text-amber-800 hover:bg-amber-200" },
    APPROVED: { label: "Aprobada", className: "bg-green-100 text-green-800 hover:bg-green-200" },
    REJECTED: { label: "Rechazada", className: "bg-red-100 text-red-800 hover:bg-red-200" },
    CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
  };
  const c = conf[estado];
  const match = options?.find(o => o.value === estado);
  const style = match?.color ? { backgroundColor: `${match.color}22`, color: match.color } : undefined;
  return <Badge className={c.className} style={style}>{match?.label || c.label}</Badge>;
}

export function OCBadge({ estado, options }: { estado: OCRow["estado"]; options?: { value: string; label: string; color?: string | null }[] }) {
  const conf: Record<OCRow["estado"], { label: string; className: string }> = {
    OPEN: { label: "Abierta", className: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
    PARTIAL: { label: "Parcial", className: "bg-amber-100 text-amber-800 hover:bg-amber-200" },
    RECEIVED: { label: "Recepcionada", className: "bg-green-100 text-green-800 hover:bg-green-200" },
    CLOSED: { label: "Cerrada", className: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
    CANCELLED: { label: "Cancelada", className: "bg-red-100 text-red-800 hover:bg-red-200" },
  };
  const c = conf[estado];
  const match = options?.find(o => o.value === estado);
  const style = match?.color ? { backgroundColor: `${match.color}22`, color: match.color } : undefined;
  return <Badge className={c.className} style={style}>{match?.label || c.label}</Badge>;
}
