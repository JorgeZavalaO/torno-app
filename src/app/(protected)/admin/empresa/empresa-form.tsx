"use client";

import { useTransition, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateEmpresa } from "./actions";
import { toast } from "sonner";
import { Loader2, Save, Building2, CheckCircle2, XCircle, ImageIcon, AlertTriangle } from "lucide-react";

type EmpresaData = {
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  logoUrl: string | null;
};

export function EmpresaForm({ initialData }: { initialData: EmpresaData }) {
  const [pending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl || "");
  const [logoStatus, setLogoStatus] = useState<"idle" | "loading" | "valid" | "invalid" | "error">("idle");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Formatos de imagen admitidos (extensiones para validación)
  const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

  // Función para convertir URLs de Google Drive a enlaces directos de imagen
  const convertGoogleDriveUrl = (url: string): string | null => {
    // Formato: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // Formato: https://drive.google.com/open?id=FILE_ID
    // Formato: https://drive.google.com/uc?id=FILE_ID
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Usar formato thumbnail que es más confiable para mostrar imágenes
        // El parámetro sz=w1000 solicita una imagen de hasta 1000px de ancho
        return `https://lh3.googleusercontent.com/d/${match[1]}=w1000`;
      }
    }
    return null;
  };

  // Detectar si es una URL de Google Drive
  const isGoogleDriveUrl = (url: string): boolean => {
    return url.includes("drive.google.com");
  };

  const validateLogo = useCallback(async (url: string) => {
    if (!url.trim()) {
      setLogoStatus("idle");
      setLogoError(null);
      setPreviewUrl(null);
      return;
    }

    // Validar formato de URL
    try {
      new URL(url);
    } catch {
      setLogoStatus("error");
      setLogoError("URL inválida. Debe comenzar con http:// o https://");
      setPreviewUrl(null);
      return;
    }

    // Determinar la URL para previsualizar
    let urlToLoad = url;
    
    // Si es Google Drive, convertir a URL directa
    if (isGoogleDriveUrl(url)) {
      const directUrl = convertGoogleDriveUrl(url);
      if (directUrl) {
        urlToLoad = directUrl;
      } else {
        setLogoStatus("error");
        setLogoError("No se pudo interpretar el enlace de Google Drive. Usa el formato de compartir.");
        setPreviewUrl(null);
        return;
      }
    } else {
      // Para URLs normales, verificar extensión
      const urlLower = url.toLowerCase();
      const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => urlLower.includes(ext));
      if (!hasValidExtension) {
        setLogoStatus("error");
        setLogoError(`Extensión no reconocida. Formatos admitidos: ${ALLOWED_EXTENSIONS.join(", ")} o Google Drive`);
        setPreviewUrl(null);
        return;
      }
    }

    setLogoStatus("loading");
    setLogoError(null);
    setPreviewUrl(urlToLoad);

    // Intentar cargar la imagen para verificar que es accesible
    const img = new Image();
    img.onload = () => {
      setLogoStatus("valid");
      setLogoError(null);
    };
    img.onerror = () => {
      setLogoStatus("invalid");
      setLogoError(
        isGoogleDriveUrl(url)
          ? "No se pudo cargar la imagen. Asegúrate de que el archivo esté compartido públicamente (Cualquier persona con el enlace)."
          : "No se pudo cargar la imagen. Verifica que la URL sea pública y accesible."
      );
    };
    img.src = urlToLoad;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validar al cambiar la URL (con debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      validateLogo(logoUrl);
    }, 500);
    return () => clearTimeout(timer);
  }, [logoUrl, validateLogo]);

  // Validar al montar si ya hay URL inicial
  useEffect(() => {
    if (initialData.logoUrl) {
      validateLogo(initialData.logoUrl);
    }
  }, [initialData.logoUrl, validateLogo]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await updateEmpresa(formData);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Datos de la Empresa
        </CardTitle>
        <CardDescription>
          Esta información aparecerá en los encabezados de los documentos PDF (cotizaciones, órdenes, etc).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre / Razón Social</Label>
              <Input 
                id="nombre" 
                name="nombre" 
                defaultValue={initialData.nombre} 
                required 
                placeholder="Ej: Torno Zavala S.A.C."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ruc">RUC / ID Fiscal</Label>
              <Input 
                id="ruc" 
                name="ruc" 
                defaultValue={initialData.ruc || ""} 
                placeholder="Ej: 20123456789"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="direccion">Dirección Completa</Label>
              <Input 
                id="direccion" 
                name="direccion" 
                defaultValue={initialData.direccion || ""} 
                placeholder="Av. Principal 123, Distrito, Ciudad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono / Celular</Label>
              <Input 
                id="telefono" 
                name="telefono" 
                defaultValue={initialData.telefono || ""} 
                placeholder="+51 999 999 999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email de Contacto</Label>
              <Input 
                id="email" 
                name="email" 
                type="email"
                defaultValue={initialData.email || ""} 
                placeholder="contacto@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="web">Sitio Web</Label>
              <Input 
                id="web" 
                name="web" 
                defaultValue={initialData.web || ""} 
                placeholder="https://www.empresa.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logoUrl">URL del Logo</Label>
              <Input 
                id="logoUrl" 
                name="logoUrl" 
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className={logoStatus === "invalid" || logoStatus === "error" ? "border-red-500" : logoStatus === "valid" ? "border-green-500" : ""}
              />
              <div className="flex items-center gap-2 text-xs">
                {logoStatus === "loading" && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Verificando imagen...</span>
                  </>
                )}
                {logoStatus === "valid" && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Imagen válida y accesible</span>
                  </>
                )}
                {logoStatus === "invalid" && (
                  <>
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-red-500">{logoError}</span>
                  </>
                )}
                {logoStatus === "error" && (
                  <>
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-500">{logoError}</span>
                  </>
                )}
                {logoStatus === "idle" && (
                  <span className="text-muted-foreground">
                    Formatos admitidos: PNG, JPG, GIF, WebP, SVG o enlace de Google Drive público.
                  </span>
                )}
              </div>
            </div>

            {/* Previsualización del Logo */}
            <div className="md:col-span-2">
              <Label>Previsualización del Logo</Label>
              <div className="mt-2 border rounded-lg p-4 bg-muted/30 min-h-[120px] flex items-center justify-center">
                {logoUrl.trim() && logoStatus === "valid" && previewUrl ? (
                  <div className="space-y-3 text-center">
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={previewUrl} 
                        alt="Logo de la empresa" 
                        className="max-h-24 max-w-[200px] object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Así se verá el logo en los documentos PDF
                      {isGoogleDriveUrl(logoUrl) && " (Google Drive)"}
                    </p>
                  </div>
                ) : logoUrl.trim() && logoStatus === "loading" ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm">Cargando previsualización...</span>
                  </div>
                ) : logoUrl.trim() && (logoStatus === "invalid" || logoStatus === "error") ? (
                  <div className="flex flex-col items-center gap-2 text-red-500">
                    <XCircle className="h-8 w-8" />
                    <span className="text-sm">No se puede mostrar la imagen</span>
                    <span className="text-xs text-muted-foreground">{logoError}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm">Ingresa una URL de logo para ver la previsualización</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
