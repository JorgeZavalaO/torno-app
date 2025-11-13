export type Provider = { id: string;
  nombre: string;
  ruc: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  currency?: string; // Moneda preferida
};

export type Product = { 
  sku: string;
  nombre: string;
  uom: string
};

export type SCItem = {
  id: string;
  productoId: string;
  nombre?: string;
  uom?: string;
  cantidad: number;
  costoEstimado?: number | null;
  cubierto?: number;
  pendiente?: number;
};

export type SCRow = {
  id: string;
  codigo?: string | null;
  estado: "PENDING_ADMIN" | "PENDING_GERENCIA" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string | Date;
  solicitante: { id: string; email: string; displayName?: string | null };
  totalEstimado: number;
  notas?: string;
  items: SCItem[];
  ocs: { id: string; codigo: string; estado: string }[];
  ot?: { id: string; codigo: string; estado?: string } | null;
  currency?: string; // moneda usada para costos estimados

  orderedTotal?: number;
  pendingTotal?: number;
};

export type OCItem = { id: string; productoId: string; nombre: string; uom: string; cantidad: number; costoUnitario: number; importe: number; pendiente?: number };
export type OCRow = {
  id: string;
  codigo: string;
  estado: "OPEN" | "PARTIAL" | "RECEIVED" | "CLOSED" | "CANCELLED";
  fecha: string | Date;
  total: number;
  proveedor: { id: string; nombre: string; ruc: string; currency?: string };
  scId: string;
  items: OCItem[];
  pendienteTotal?: number;
  currency?: string; // moneda de la OC
};

export type Actions = {
  createProvider: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>;
  updateProvider: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>;
  deleteProvider: (id: string) => Promise<{ ok: boolean; message?: string }>;
  createSC: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>;
  setSCState: (id: string, estado: SCRow["estado"], nota?: string) => Promise<{ ok: boolean; message?: string }>;
  createOC: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string; codigo?: string }>;
  receiveOC: (fd: FormData) => Promise<{ ok: boolean; message?: string; newEstado?: string }>;
  updateSCCosts: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
};

import { getCostingParamByKey } from "@/app/server/queries/costing-params";

export const fmtCurrency = (n: number, c?: string) => {
  const currency = c || "USD"; // fallback por si no se proporciona
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
};

export const fmtCurrencyAsync = async (n: number) => {
  try {
    const currencyParam = await getCostingParamByKey("currency");
    const currency = currencyParam?.valueText || "USD";
    return fmtCurrency(n, currency);
  } catch (error) {
    console.error("Error obteniendo moneda del sistema:", error);
    return fmtCurrency(n, "USD");
  }
};
