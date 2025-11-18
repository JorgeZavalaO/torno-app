/**
 * Utilidades para trabajar con fracciones de pulgada
 * Convierte entre notación fraccionaria (1 1/2") y decimal (1.5)
 */

export interface FractionParts {
  whole: number;
  numerator: number;
  denominator: number;
}

/**
 * Conversión de fracción a decimal
 * Soporta: "1/2", "1 1/2", "1 1/2\"", "2\""
 */
export function fractionToDecimal(input: string): number | null {
  if (!input || input.trim() === "") return null;

  // Limpiar entrada: remover espacios extras y comillas
  const cleaned = input.trim().replace(/"/g, "").replace(/\s+/g, " ");

  // Intentar parsear como número decimal directo
  const asNumber = parseFloat(cleaned);
  if (!isNaN(asNumber) && cleaned === asNumber.toString()) {
    return asNumber;
  }

  // Separar parte entera y fraccionaria
  const parts = cleaned.split(" ");
  let whole = 0;
  let fractionStr = "";

  if (parts.length === 1) {
    // Solo fracción o solo número
    if (parts[0].includes("/")) {
      fractionStr = parts[0];
    } else {
      return parseFloat(parts[0]) || null;
    }
  } else if (parts.length === 2) {
    // Número entero + fracción
    whole = parseInt(parts[0], 10);
    fractionStr = parts[1];
  } else {
    return null;
  }

  // Parsear fracción
  if (fractionStr && fractionStr.includes("/")) {
    const [numStr, denomStr] = fractionStr.split("/");
    const numerator = parseInt(numStr, 10);
    const denominator = parseInt(denomStr, 10);

    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
      return null;
    }

    return whole + numerator / denominator;
  }

  return null;
}

/**
 * Conversión de decimal a fracción
 * Retorna notación como "1 1/2" o "1/2"
 * Soporta decimales con hasta 4 posiciones
 */
export function decimalToFraction(value: number): string {
  if (!value && value !== 0) return "";

  const whole = Math.floor(value);
  const decimal = value - whole;

  // Si es un número entero
  if (decimal === 0) {
    return whole === 0 ? "" : whole.toString();
  }

  // Fracciones comunes en pulgadas (hasta 1/16)
  const fractions = [
    { decimal: 0.0625, str: "1/16" },
    { decimal: 0.125, str: "1/8" },
    { decimal: 0.1875, str: "3/16" },
    { decimal: 0.25, str: "1/4" },
    { decimal: 0.3125, str: "5/16" },
    { decimal: 0.375, str: "3/8" },
    { decimal: 0.4375, str: "7/16" },
    { decimal: 0.5, str: "1/2" },
    { decimal: 0.5625, str: "9/16" },
    { decimal: 0.625, str: "5/8" },
    { decimal: 0.6875, str: "11/16" },
    { decimal: 0.75, str: "3/4" },
    { decimal: 0.8125, str: "13/16" },
    { decimal: 0.875, str: "7/8" },
    { decimal: 0.9375, str: "15/16" },
  ];

  // Buscar la fracción más cercana
  let closest = fractions[0];
  let minDiff = Math.abs(decimal - closest.decimal);

  for (const frac of fractions) {
    const diff = Math.abs(decimal - frac.decimal);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frac;
    }
  }

  // Retornar formato: "1 1/2" o solo "1/2"
  if (whole > 0) {
    return `${whole} ${closest.str}`;
  } else {
    return closest.str;
  }
}

/**
 * Parsear entrada de usuario y convertir a decimal
 * Soporta múltiples formatos de entrada
 */
export function parseInchInput(input: string): number | null {
  if (!input || input.trim() === "") return null;

  try {
    return fractionToDecimal(input);
  } catch {
    return null;
  }
}

/**
 * Validar si una entrada es una fracción válida
 */
export function isValidFractionInput(input: string): boolean {
  const decimal = parseInchInput(input);
  return decimal !== null && decimal >= 0;
}

/**
 * Obtener sugerencias de fracciones cercanas basadas en entrada
 */
export function getFractionSuggestions(input: string): string[] {
  const decimal = parseInchInput(input);
  if (decimal === null) return [];

  const suggestions: string[] = [];
  const commonFractions = [
    1 / 16,
    1 / 8,
    3 / 16,
    1 / 4,
    5 / 16,
    3 / 8,
    7 / 16,
    1 / 2,
    9 / 16,
    5 / 8,
    11 / 16,
    3 / 4,
    13 / 16,
    7 / 8,
    15 / 16,
  ];

  // Sugerir fracciones cercanas
  for (let i = 0; i <= Math.floor(decimal); i++) {
    for (const frac of commonFractions) {
      const value = i + frac;
      if (Math.abs(value - decimal) < 0.1) {
        const formatted = decimalToFraction(value);
        if (formatted && !suggestions.includes(formatted)) {
          suggestions.push(formatted);
        }
      }
    }
  }

  return suggestions.sort((a, b) => {
    const aVal = parseInchInput(a) || 0;
    const bVal = parseInchInput(b) || 0;
    return Math.abs(aVal - decimal) - Math.abs(bVal - decimal);
  });
}
