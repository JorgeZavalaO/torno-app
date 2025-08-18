"use client";

import { QuoteList } from "@/components/cotizador/quote-list";
import { QuoteHeader } from "@/components/cotizador/quote-header";

type Quote = {
  id: string;
  createdAt: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  currency: string;
  qty: number;
  total: number;
  unitPrice: number;
  cliente: { id: string; nombre: string; ruc: string };
};

interface QuotesClientProps {
  initialItems: Quote[];
  canWrite: boolean;
  clients: Array<{ id: string; nombre: string; ruc: string }>;
  params: Record<string, string | number>;
  action: (fd: FormData) => Promise<{ ok: boolean; id?: string; message?: string }>;
  ots?: { id: string; codigo: string }[];
}

export default function QuotesClient({ 
  initialItems, 
  canWrite, 
  clients, 
  params, 
  action 
  , ots
}: QuotesClientProps) {
  return (
    <div className="p-6 space-y-6">
      <QuoteHeader
        canWrite={canWrite}
        clients={clients}
        params={params}
        action={action}
        quotes={initialItems}
        ots={ots}
      />
      
      <QuoteList
        quotes={initialItems}
        canWrite={canWrite}
      />
    </div>
  );
}
