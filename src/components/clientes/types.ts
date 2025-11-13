export type Client = {
  id: string;
  nombre: string;
  ruc: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  activo: boolean;
};

export type ClientActions = {
  createClient: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  updateClient: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  deleteClient: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  importClients: (file: File) => Promise<{ ok: boolean; message?: string }>;
};

export type QuoteData = {
  id: string;
  codigo?: string | null;
  createdAt: string;
  status: string;
  total: number;
  currency?: string;
  unitPrice: number;
};