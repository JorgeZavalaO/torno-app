"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const alertConfig = {
  info: {
    icon: Info,
    className: "bg-blue-50 border-blue-200 text-blue-800",
  },
  success: {
    icon: CheckCircle,
    className: "bg-green-50 border-green-200 text-green-800",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  error: {
    icon: XCircle,
    className: "bg-red-50 border-red-200 text-red-800",
  },
};

export function Alert({ type = "info", title, children, className }: AlertProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("border rounded-lg p-4 flex gap-3", config.className, className)}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
