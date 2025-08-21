export type Provider = { id: string; nombre: string; ruc: string; email?: string; telefono?: string };
export type Product = { sku: string; nombre: string; uom: string };

export type SCItem = { id?: string; productoId: string; nombre?: string; uom?: string; cantidad: number; costoEstimado?: number | null };
export type SCRow = {
  id: string;
  estado: "PENDING_ADMIN" | "PENDING_GERENCIA" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string | Date;
  solicitante: { id: string; email: string; displayName?: string | null };
  totalEstimado: number;
  notas?: string;
  items: SCItem[];
  oc: { id: string; codigo: string; estado: string } | null;
  ot?: { id: string; codigo: string; estado?: string } | null;
};

export type OCItem = { id: string; productoId: string; nombre: string; uom: string; cantidad: number; costoUnitario: number; importe: number; pendiente?: number };
export type OCRow = {
  id: string;
  codigo: string;
  estado: "OPEN" | "PARTIAL" | "RECEIVED" | "CLOSED" | "CANCELLED";
  fecha: string | Date;
  total: number;
  proveedor: { id: string; nombre: string; ruc: string };
  scId: string;
  items: OCItem[];
  pendienteTotal?: number;
};

export type Actions = {
  createProvider: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>;
  updateProvider: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>;
  deleteProvider: (id: string) => Promise<{ ok: boolean; message?: string }>;
  createSC: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string }>;
  setSCState: (id: string, estado: SCRow["estado"], nota?: string) => Promise<{ ok: boolean; message?: string }>;
  createOC: (fd: FormData) => Promise<{ ok: boolean; message?: string; id?: string; codigo?: string }>;
  receiveOC: (fd: FormData) => Promise<{ ok: boolean; message?: string; newEstado?: string }>;
};

export const fmtCurrency = (n: number, c = "PEN") => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);
