"use client";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUp, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function ImportModal({
  importAction, onImported,
}: {
  importAction: (file: File) => Promise<{ ok: boolean; message?: string }>;
  onImported?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();

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

  const onSubmit = () => {
    if (error) return;
    if (!file) {
      setError("Selecciona un archivo para importar");
      return;
    }
    start(async () => {
      const res = await importAction(file);
      if (res.ok) {
        toast.success(res.message ?? "Importado");
      } else {
        toast.error(res.message ?? "Error al importar");
      }
      if (res.ok) onImported?.();
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Importar clientes</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Zona Drag & Drop */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <input
              id="file-input"
              type="file"
              accept={acceptExts.join(",")}
              className="hidden"
              onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
              disabled={pending}
            />
            {!file ? (
              <label htmlFor="file-input" className="cursor-pointer inline-flex flex-col items-center gap-2">
                <FileUp className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm">
                  Arrastra un archivo aquí o
                  <span className="text-primary font-medium"> haz clic para seleccionar</span>
                </div>
                <div className="text-xs text-muted-foreground">Formatos: .xlsx, .csv — Máx {maxSizeMB} MB</div>
              </label>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleSelect(null)} disabled={pending} aria-label="Quitar archivo">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {error && <div className="text-xs text-destructive">{error}</div>}

          <p className="text-xs text-muted-foreground">
            Columnas requeridas: <b>nombre, ruc</b>. Opcionales: email, telefono, direccion, contactoNombre, contactoTelefono, estado (Activo/Inactivo).
          </p>

          <div className="flex items-center justify-between gap-3">
            <a className="underline text-sm" href="/plantillas/clientes.csv" download>
              Descargar plantilla (CSV)
            </a>
            <Button onClick={onSubmit} disabled={pending || !file || !!error}>
              {pending ? "Importando..." : "Subir e importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
