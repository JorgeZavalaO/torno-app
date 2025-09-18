"use client";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUp, Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportModalProps {
  importAction: (file: File) => Promise<{ ok: boolean; message?: string }>;
  onImported?: () => void;
  trigger?: React.ReactNode;
}

export default function ImportModal({
  importAction,
  onImported,
  trigger,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const acceptExts = useMemo(() => [".xlsx", ".csv"], []);
  const maxSizeMB = 10;

  const validateFile = useCallback((f: File | null): string | null => {
    if (!f) return "Selecciona un archivo .xlsx o .csv";
    const lower = f.name.toLowerCase();
    const validExt = acceptExts.some((ext) => lower.endsWith(ext));
    if (!validExt) return "Formato inválido. Usa .xlsx o .csv";
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) return `El archivo supera ${maxSizeMB} MB`;
    return null;
  }, [acceptExts]);

  const handleSelect = (f: File | null) => {
    const err = validateFile(f);
    setError(err);
    setFile(err ? null : f);
  };

  const handleSubmit = () => {
    if (error || !file) {
      setError("Selecciona un archivo válido para importar");
      return;
    }

    start(async () => {
      try {
        const res = await importAction(file);
        if (res.ok) {
          toast.success(res.message ?? "Clientes importados correctamente");
          setOpen(false);
          setFile(null);
          setError(null);
          onImported?.();
          router.refresh();
        } else {
          toast.error(res.message ?? "Error al importar clientes");
        }
      } catch (error) {
        console.error("Error en importación:", error);
        toast.error("Error inesperado al importar");
      }
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    handleSelect(f);
  };

  const defaultTrigger = (
    <Button variant="secondary" size="sm" className="gap-2">
      <Upload className="h-4 w-4" />
      Importar
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar clientes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Zona Drag & Drop */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : error
                ? "border-destructive"
                : "border-muted-foreground/25"
            }`}
          >
            <FileUp className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Arrastra un archivo aquí o haz clic para seleccionar
            </p>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
              className="hidden"
              id="file-input"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("file-input")?.click()}
              disabled={pending}
            >
              Seleccionar archivo
            </Button>
          </div>

          {/* File Info */}
          {file && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(null)}
                disabled={pending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Info sobre formato */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Formatos soportados:</strong> .xlsx, .csv</p>
            <p><strong>Columnas esperadas:</strong> nombre, ruc, email, telefono, direccion, contactoNombre, contactoTelefono, estado</p>
            <p><strong>Tamaño máximo:</strong> {maxSizeMB} MB</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={pending || !file || !!error}
              className="flex-1"
            >
              {pending ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}