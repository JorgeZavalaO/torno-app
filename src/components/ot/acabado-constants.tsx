// Lista centralizada de opciones de acabado
export const ACABADO_OPTIONS = [
  { value: "NONE", label: "Ninguno" },
  { value: "ZINCADO", label: "Zincado" },
  { value: "TROPICALIZADO", label: "Tropicalizado" },
  { value: "PINTADO", label: "Pintado" },
] as const;

export type AcabadoValue = typeof ACABADO_OPTIONS[number]["value"];
