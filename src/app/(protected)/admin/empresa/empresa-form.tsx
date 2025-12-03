"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateEmpresa } from "./actions";
import { toast } from "sonner";
import { Loader2, Save, Building2 } from "lucide-react";

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
                defaultValue={initialData.logoUrl || ""} 
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Ingresa la URL pública de tu logo. Recomendado: PNG transparente.
              </p>
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
