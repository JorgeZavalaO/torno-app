import { z } from "zod";

export const CATEGORIES = [
  "MATERIA_PRIMA",
  "HERRAMIENTA_CORTE",
  "CONSUMIBLE",
  "REPUESTO",
  "FABRICACION",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CategoryEnum = z.enum(CATEGORIES as unknown as [string, ...string[]]);

export const CATEGORY_PREFIX: Record<Category, string> = {
  MATERIA_PRIMA: "MP",
  HERRAMIENTA_CORTE: "HC",
  CONSUMIBLE: "CO",
  REPUESTO: "RP",
  FABRICACION: "FB",
};

export default CATEGORIES;
