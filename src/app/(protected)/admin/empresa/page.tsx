import { getEmpresaCached } from "@/app/server/queries/empresa";
import { EmpresaForm } from "./empresa-form";
import { Separator } from "@/components/ui/separator";

export default async function EmpresaPage() {
  const empresa = await getEmpresaCached();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configuración de Empresa</h3>
        <p className="text-sm text-muted-foreground">
          Gestiona la identidad de tu empresa para los documentos generados.
        </p>
      </div>
      <Separator />
      <div className="max-w-2xl">
        <EmpresaForm initialData={empresa} />
      </div>
    </div>
  );
}
