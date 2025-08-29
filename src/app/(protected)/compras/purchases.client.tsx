"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Actions, OCRow, Product, Provider, SCRow } from "@/components/compras/types";
import { NewSCDialog } from "@/components/compras/new-sc-dialog";
import { SCList } from "@/components/compras/sc-list";
import { OCList } from "@/components/compras/oc-list";
import { ProvidersList } from "@/components/compras/providers-list";
import { CreateProviderDialog } from "@/components/compras/create-provider-dialog";

export default function ComprasClient({ currency, canWrite, providers, scs, ocs, products, actions }: {
  currency: string;
  canWrite: boolean;
  providers: Provider[];
  scs: SCRow[];
  ocs: OCRow[];
  products: Product[];
  actions: Actions;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"sc" | "oc" | "prov">("sc");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="text-muted-foreground">Solicitudes, Órdenes de Compra y Proveedores</p>
        </div>
        {canWrite && tab === "sc" && (
          <NewSCDialog
            products={products}
            onCreate={async (payload) => {
              const fd = new FormData();
              fd.set("items", JSON.stringify(payload.items));
              if (payload.otId) fd.set("otId", payload.otId);
              if (payload.notas) fd.set("notas", payload.notas);
              const r = await actions.createSC(fd);
              // Control de feedback y recarga se maneja dentro de SCList tras setSCState/OC
              if (!r.ok) {
                // fallback de error si algo falla
                console.error(r.message);
              } else {
                // reload para refrescar datos
                router.refresh();
              }
            }}
          />
        )}
      </div>

      <Tabs value={tab} onValueChange={(v)=>setTab(v as "sc" | "oc" | "prov")}>
        <TabsList>
          <TabsTrigger value="sc">Solicitudes</TabsTrigger>
          <TabsTrigger value="oc">Órdenes</TabsTrigger>
          <TabsTrigger value="prov">Proveedores</TabsTrigger>
        </TabsList>

        {/* SC */}
        <TabsContent value="sc" className="space-y-4">
          <SCList rows={scs} providers={providers} canWrite={canWrite} actions={actions} />
        </TabsContent>

        {/* OC */}
        <TabsContent value="oc" className="space-y-4">
          <OCList rows={ocs} canWrite={canWrite} actions={actions} currency={currency} />
        </TabsContent>

        {/* Proveedores */}
        <TabsContent value="prov" className="space-y-4">
          {canWrite && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Gestiona tus proveedores: crea, edita o elimina.</div>
              <CreateProviderDialog onCreate={actions.createProvider} />
            </div>
          )}
          <ProvidersList providers={providers} actions={canWrite ? { updateProvider: actions.updateProvider, deleteProvider: actions.deleteProvider } : undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
 
