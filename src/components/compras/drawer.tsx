"use client";
import { ReactNode } from "react";

export function Drawer({ open, onOpenChange, title, children, width = 520 }: { open: boolean; onOpenChange: (open: boolean) => void; title?: string; children: ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div
        className="absolute inset-y-0 right-0 bg-background shadow-xl border-l p-4 flex flex-col"
        style={{ width: Math.min(width, window.innerWidth) }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-lg">{title}</div>
          <button className="text-sm text-muted-foreground hover:underline" onClick={() => onOpenChange(false)} aria-label="Cerrar">
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
