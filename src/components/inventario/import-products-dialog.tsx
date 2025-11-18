"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/product-categories";

// Función auxiliar para crear Excel simple sin dependencias externas
const createSimpleExcel = (categoryOptions?: { value: string; label: string }[]) => {
  const headers = ["Nombre", "Categoría", "UOM", "Costo", "StockMinimo", "Material", "Milimetros", "Pulgadas"];
  const cats = categoryOptions && categoryOptions.length > 0 ? categoryOptions.map((c) => c.value) : CATEGORIES;
  const sampleRows = [
    ["Tornillo hexagonal 1/2", cats[0], "pz", 2.50, 100, "Acero inoxidable", 12.7, 0.5],
    ["Tuerca hexagonal 3/4", cats[0], "pz", 3.75, 50, "Acero al carbono", 19.05, 0.75],
    ["Arandela plana 1", cats[0], "pz", 0.50, 200, "Acero galvanizado", 25.4, 1],
    ["Perno M10", cats[1] ?? cats[0], "pz", 1.80, 150, "Acero", 10, ""],
    ["Eje de transmisión", cats[2] ?? cats[0], "und", 450.00, 5, "Acero forjado", "", ""],
    ["Rodamiento 6205", cats[3] ?? cats[0], "pz", 25.00, 20, "", "", ""],
    ["Lubricante industrial", cats[4] ?? cats[0], "l", 45.75, 10, "", "", ""],
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/30 shadow-sm">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">Importar productos</DialogTitle>
              <DialogDescription className="text-sm mt-1.5">
                Importa múltiples productos desde un archivo Excel
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-4">
          {/* Download Template Section */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-blue/5 to-blue/0 border-2 border-blue/20 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue/20 ring-2 ring-blue/30">
                <Download className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold">Plantilla Excel</h3>
            </div>
            
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50/50 border border-blue-200/50">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Descarga la plantilla para ver el formato requerido. Incluye campos opcionales: <strong>Material</strong>, <strong>Milimetros</strong> y <strong>Pulgadas</strong>. Los SKUs se generarán automáticamente.
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={downloadTemplate} 
              className="w-full gap-2 transition-all hover:bg-blue-50 hover:border-blue-300"
            >
              <Download className="h-4 w-4" /> Descargar plantilla Excel
            </Button>
          </div>

          <Separator />

          {/* Upload File Section */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/0 border-2 border-green-500/20 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/20 ring-2 ring-green-500/30">
                <FileUp className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-base font-semibold">Cargar archivo</h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="excelFile" className="text-sm font-medium">
                Selecciona el archivo Excel
              </label>
              <input
                id="excelFile"
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 file:transition-all file:cursor-pointer cursor-pointer border-2 border-dashed border-border/50 rounded-lg p-3 hover:border-green-500/50 transition-all"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {file ? (
                <div className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-green-50/50 border border-green-200/50">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-green-700 font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/80 italic">
                  Ningún archivo seleccionado
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            disabled={uploading} 
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button 
            disabled={!file || uploading} 
            onClick={uploadFile} 
            className="flex-1 sm:flex-none gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Importando...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4" /> Importar productos
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
