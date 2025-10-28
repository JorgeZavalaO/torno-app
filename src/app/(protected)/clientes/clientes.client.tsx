"use client";

import { useDeferredValue, useMemo, useState, startTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ClientModal,
  ImportModal,
  ClientTable,
  QuotesModal,
  type Client,
  type ClientActions,
  type QuoteData,
} from "@/components/clientes";

interface ClientesClientProps {
  initialItems: Client[];
  canWrite: boolean;
  params?: Record<string, string | number>;
  actions: ClientActions;
}

export default function ClientesClient({
  initialItems,
  canWrite,
  params,
  actions,
}: ClientesClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<Client[]>(initialItems);
  const [query, setQuery] = useState("");
  const [quotesState, setQuotesState] = useState<{
    open: boolean;
    client?: Client | null;
  }>({ open: false, client: null });
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Defer del input para evitar bloques de UI en listas grandes
  const deferredQuery = useDeferredValue(query);

  const filteredClients = useMemo(() => {
    const searchTerm = deferredQuery.trim().toLowerCase();
    if (!searchTerm) return items;

    return items.filter((client) =>
      [
        client.nombre,
        client.ruc,
        client.email ?? "",
        client.telefono ?? "",
      ].some((value) => value.toLowerCase().includes(searchTerm))
    );
  }, [deferredQuery, items]);

  const handleClientDeleted = (id: string) => {
    setItems((prev) => prev.filter((client) => client.id !== id));
  };

  const handleClientCreated = (client: Client) => {
    setItems((prev) => [client, ...prev]);
  };

  const handleClientUpdated = (client: Client) => {
    setItems((prev) => prev.map((c) => (c.id === client.id ? client : c)));
  };

  const handleOpenQuotes = async (client: Client) => {
    setQuotesState({ open: true, client });
    setLoadingQuotes(true);

    try {
      const response = await fetch(`/api/clients/${client.id}/quotes`);
      if (!response.ok) throw new Error("Error al cargar cotizaciones");

      const data = await response.json();
      setQuotes(data);
    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
      toast.error("No se pudieron cargar las cotizaciones");
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleImported = () => {
    startTransition(() => router.refresh());
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Lista de Clientes</h1>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <ImportModal
                importAction={actions.importClients}
                onImported={handleImported}
              />
              <ClientModal mode="create" action={actions.createClient} onClientCreated={handleClientCreated} />
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-3 max-w-lg">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clientes por nombre, RUC, email, teléfono..."
          />
        </div>
      </Card>

      {/* Results Info */}
      {deferredQuery && (
        <div className="text-sm text-muted-foreground">
          {filteredClients.length > 0
            ? `${filteredClients.length} cliente${
                filteredClients.length !== 1 ? "s" : ""
              } encontrado${filteredClients.length !== 1 ? "s" : ""}`
            : "Sin resultados para tu búsqueda"}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <ClientTable
          clients={filteredClients}
          canWrite={canWrite}
          actions={actions}
          onDeleted={handleClientDeleted}
          onClientCreated={handleClientCreated}
          onClientUpdated={handleClientUpdated}
          onOpenQuotes={handleOpenQuotes}
        />
      </Card>

      {/* Quotes Modal */}
      <QuotesModal
        state={quotesState}
        onOpenChange={(open) =>
          setQuotesState((prev) => ({ ...prev, open }))
        }
        quotes={quotes}
        loading={loadingQuotes}
        systemCurrency={String(params?.currency ?? "PEN")}
      />
    </div>
  );
}
