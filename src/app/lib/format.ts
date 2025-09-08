/**
 * Utilidades para formateo de datos en la aplicación
 */

/**
 * Formatea un valor monetario con la moneda especificada
 */
export function formatCurrency(
  amount: number | string,
  currency: string = "PEN",
  locale: string = "es-PE"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return `${currency} 0.00`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    // Fallback si la moneda no es reconocida por Intl
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(
  value: number | string,
  decimals: number = 2,
  locale: string = "es-PE"
): string {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return "0";
  }

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericValue);
  } catch {
    return numericValue.toFixed(decimals);
  }
}

/**
 * Formatea un porcentaje
 */
export function formatPercentage(
  value: number | string,
  decimals: number = 1,
  locale: string = "es-PE"
): string {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return "0%";
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericValue / 100);
  } catch {
    return `${numericValue.toFixed(decimals)}%`;
  }
}

/**
 * Formatea una fecha en formato legible
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  locale: string = "es-PE"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Fecha inválida";
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch {
    return dateObj.toLocaleDateString();
  }
}

/**
 * Formatea un tiempo en formato horas:minutos
 */
export function formatTime(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) {
    return "0:00";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  
  return `${hours}:${remainingMinutes.toString().padStart(2, "0")}`;
}

/**
 * Convierte bytes a formato legible
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Trunca un texto con elipsis
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitaliza la primera letra de una cadena
 */
export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convierte un valor decimal de base de datos a porcentaje para mostrar
 */
export function decimalToPercentage(decimal: number | string): number {
  const numericValue = typeof decimal === "string" ? parseFloat(decimal) : decimal;
  return isNaN(numericValue) ? 0 : numericValue * 100;
}

/**
 * Convierte un porcentaje de input a decimal para guardar en BD
 */
export function percentageToDecimal(percentage: number | string): number {
  const numericValue = typeof percentage === "string" ? parseFloat(percentage) : percentage;
  return isNaN(numericValue) ? 0 : numericValue / 100;
}
