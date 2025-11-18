import { z } from "zod";

export const CATEGORIES = [
  "MATERIA_PRIMA",
  "PIEZA_FABRICADA",
  "HERRAMIENTA_CORTE",
  "HERRAMIENTA",
  "CONSUMIBLE",
  "REPUESTO",
  "INSUMO",
  "REFACCION",
  "FABRICACION",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CategoryEnum = z.enum(CATEGORIES as unknown as [string, ...string[]]);

export const CATEGORY_PREFIX: Record<Category, string> = {
  MATERIA_PRIMA: "MP",
  PIEZA_FABRICADA: "FB",
  HERRAMIENTA_CORTE: "HC",
  HERRAMIENTA: "HE",
  CONSUMIBLE: "CO",
  REPUESTO: "RP",
  INSUMO: "IN",
  REFACCION: "RF",
  FABRICACION: "FB",
};

export default CATEGORIES;
