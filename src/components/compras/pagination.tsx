"use client";
import { Button } from "@/components/ui/button";

export function Pagination({ page, total, pageSize, onPageChange }: { page: number; total: number; pageSize: number; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < pages;
  return (
    <div className="flex items-center justify-end gap-2 py-2">
      <div className="text-sm text-muted-foreground mr-auto">{total} resultados</div>
      <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>Anterior</Button>
      <div className="text-sm">Página {page} de {pages}</div>
      <Button size="sm" variant="outline" disabled={!canNext} onClick={() => onPageChange(page + 1)}>Siguiente</Button>
    </div>
  );
}
