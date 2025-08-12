"use client";

import { Badge } from "@/components/ui/badge";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
}

const statusConfig = {
  DRAFT: {
    label: "Borrador",
    variant: "secondary" as const,
    className: "bg-gray-100 text-gray-800 hover:bg-gray-200"
  },
  SENT: {
    label: "Enviada",
    variant: "default" as const,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-200"
  },
  APPROVED: {
    label: "Aprobada",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-200"
  },
  REJECTED: {
    label: "Rechazada",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 hover:bg-red-200"
  },
};

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant}
      className={config.className}
    >
      {config.label}
    </Badge>
  );
}
