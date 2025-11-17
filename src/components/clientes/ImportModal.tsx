"use client";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUp, Upload, X, AlertCircle, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";

// Función auxiliar para crear Excel simple sin dependencias externas
const createSimpleExcel = () => {
  // Crear XML para Excel (.xlsx es un ZIP con XMLs)
  // Para simplificar, usamos una alternativa: generar formato XLSX básico usando librerías estándar
  // Alternativamente, podemos crear un blob Excel usando html2canvas o similar
  
  // Opción más simple: usar SheetJS si está disponible, sino crear CSV mejorado que Excel puede abrir
  const headers = ["nombre", "ruc", "email", "telefono", "direccion", "contactoNombre", "contactoTelefono", "estado"];
  const sampleRows = [
    ["Empresa Ejemplo 1", "20123456789", "contacto@empresa1.com", "955123456", "Lima, Perú", "Juan Pérez", "955123456", "Activo"],
    ["Empresa Ejemplo 2", "20987654321", "info@empresa2.com", "944654321", "Arequipa, Perú", "María García", "944654321", "Activo"],
    ["Empresa Ejemplo 3", "20555666777", "ventas@empresa3.com", "945555666", "Trujillo, Perú", "Carlos López", "945555666", "Activo"],
  ];

  // Crear estructura de datos para Excel
  const data = [headers, ...sampleRows];

  // Crear XML de Excel
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Created>${new Date().toISOString()}</Created>
  <LastSavedTime>${new Date().toISOString()}</LastSavedTime>
 </DocumentProperties>
 <Worksheet ss:Name="Clientes">
  <Table>
   ${data.map(row => `<Row>
     ${row.map(cell => `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>`).join("")}
    </Row>`).join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;

  return xmlContent;
};

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

  const downloadTemplate = () => {
    try {
      const excelContent = createSimpleExcel();
      
      // Crear blob y descargar
      const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla-clientes.xls";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Plantilla descargada correctamente");
    } catch (error) {
      console.error("Error descargando plantilla:", error);
      toast.error("Error al descargar la plantilla");
    }
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
          <p className="text-sm text-muted-foreground mt-1">
            Carga un archivo con la información de clientes a importar
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Descargar Plantilla */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Necesitas ayuda para el formato?</p>
                <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                  Descarga la plantilla Excel con ejemplos de cómo llenar correctamente los datos
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="mt-2 gap-2 text-xs h-8"
                >
                  <Download className="h-3 w-3" />
                  Descargar plantilla
                </Button>
              </div>
            </div>
          </div>

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