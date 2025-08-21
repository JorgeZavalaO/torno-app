import type { Category } from "@/lib/product-categories";

export type ProductRow = {
  sku: string;
  nombre: string;
  categoria: Category;
  uom: string;
  costo: number;
  stockMinimo: number | null;
  stock: number;
  lastCost: number;
  stockValue: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MovementRow = {
  id: string;
  fecha: string | Date;
  tipo: "INGRESO_COMPRA"|"INGRESO_AJUSTE"|"SALIDA_AJUSTE"|"SALIDA_OT"|"INGRESO_OT";
  productoId: string;
  productoNombre: string;
  categoria: ProductRow["categoria"];
  cantidad: number;
  uom: string;
  costoUnitario: number;
  importe: number;
  nota?: string;
};

export type ProductOption = { sku: string; nombre: string; uom: string };

export type Actions = {
  createProduct: (fd: FormData) => Promise<{ ok: boolean; message?: string; sku?: string }>;
  updateProduct: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  deleteProduct: (sku: string) => Promise<{ ok: boolean; message?: string }>;
  createMovement: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  importProducts: (file: File) => Promise<{ ok: boolean; message?: string; imported?: number }>;
};
