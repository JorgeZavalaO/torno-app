"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/product-categories";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ImportProductsDialog({
  open, 
  onOpenChange,
  onSuccess,
  actions
}:{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (msg: string) => void;
  actions: { importProducts: (file: File) => Promise<{ok: boolean; message?: string; imported?: number}> };
}) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const downloadTemplate = () => {
    // CSV template: Nombre,Categoría,UOM,Costo,StockMinimo
    const sampleRows = [
      `Ejemplo Pieza 1,${CATEGORIES[0]},kg,120.50,10`,
      `Ejemplo Pieza 2,${CATEGORIES[1]},pz,350.00,2`,
      `Ejemplo Pieza 3,${CATEGORIES[4]},pz,150.00,5`,
      `Ejemplo Pieza 4,${CATEGORIES[2]},l,45.75,5`,
      `Ejemplo Pieza 5,${CATEGORIES[3]},und,78.20,`,
    ];

    const templateContent = [
      "Nombre,Categoría,UOM,Costo,StockMinimo",
      ...sampleRows,
    ].join("\n");
    
    const blob = new Blob([templateContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_productos.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const uploadFile = async () => {
    if (!file) {
      toast.error("Debes seleccionar un archivo CSV");
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
          <DialogDescription>
            Importa múltiples productos desde un archivo CSV
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertDescription>
            Descarga la plantilla CSV para ver el formato requerido. No incluyas SKUs, se generarán automáticamente.
          </AlertDescription>
        </Alert>
        
        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" /> Descargar plantilla
        </Button>
        
        <Separator />
        
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <label htmlFor="csvFile" className="text-sm font-medium">
            Archivo CSV
          </label>
          <input
            id="csvFile"
            type="file"
            accept=".csv"
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary/90"
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
