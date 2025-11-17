"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/product-categories";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Función auxiliar para crear Excel simple sin dependencias externas
const createSimpleExcel = (categoryOptions?: { value: string; label: string }[]) => {
  const headers = ["Nombre", "Categoría", "UOM", "Costo", "StockMinimo"];
  const cats = categoryOptions && categoryOptions.length > 0 ? categoryOptions.map((c) => c.value) : CATEGORIES;
  const sampleRows = [
    ["Ejemplo Pieza 1", cats[0], "kg", 120.50, 10],
    ["Ejemplo Pieza 2", cats[1] ?? cats[0], "pz", 350.00, 2],
    ["Ejemplo Pieza 3", cats[4] ?? cats[0], "pz", 150.00, 5],
    ["Ejemplo Pieza 4", cats[2] ?? cats[0], "l", 45.75, 5],
    ["Ejemplo Pieza 5", cats[3] ?? cats[0], "und", 78.20, ""],
  ];

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
 <Worksheet ss:Name="Productos">
  <Table>
   ${data.map(row => `<Row>
     ${row.map(cell => `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>`).join("")}
    </Row>`).join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;

  return xmlContent;
};

export function ImportProductsDialog({
  open,
  onOpenChange,
  onSuccess,
  actions,
  categoryOptions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  actions: { importProducts: (file: File) => Promise<{ ok: boolean; message?: string; imported?: number }> };
  categoryOptions?: { value: string; label: string }[];
}) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const downloadTemplate = () => {
    try {
      const excelContent = createSimpleExcel(categoryOptions);
      
      // Crear blob y descargar
      const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla-productos.xls";
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

  const uploadFile = async () => {
    if (!file) {
      toast.error("Debes seleccionar un archivo Excel");
      return;
    }

    setUploading(true);
    try {
      const result = await actions.importProducts(file);
      if (result.ok) {
        onSuccess(`${result.imported} productos importados exitosamente`);
        onOpenChange(false);
        setFile(null);
      } else {
        toast.error(result.message || "Error al importar");
      }
    } catch (error) {
      toast.error("Error al procesar el archivo");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
          <div className="text-sm text-muted-foreground">Importa múltiples productos desde un archivo Excel</div>
        </DialogHeader>

        <Alert>
          <AlertDescription>
            Descarga la plantilla Excel para ver el formato requerido. No incluyas SKUs, se generarán automáticamente.
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" /> Descargar plantilla
        </Button>

        <Separator />

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <label htmlFor="excelFile" className="text-sm font-medium">
            Archivo Excel
          </label>
          <input
            id="excelFile"
            type="file"
            accept=".xlsx,.xls"
            className={"block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"}
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">
            {file ? `Archivo seleccionado: ${file.name}` : "Ningún archivo seleccionado"}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={uploading} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!file || uploading} onClick={uploadFile} className="gap-2">
            {uploading ? "Importando..." : (
              <>
                <FileUp className="h-4 w-4" /> Importar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
