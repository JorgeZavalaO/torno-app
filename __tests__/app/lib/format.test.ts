import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatTime,
  formatBytes,
  truncateText,
  capitalize,
  decimalToPercentage,
  percentageToDecimal,
} from "@/app/lib/format";

describe("format utils", () => {
  describe("formatCurrency", () => {
    it("formatea USD por defecto", () => {
      const s = formatCurrency(1234.5);
      expect(s).toMatch(/\p{Sc}?\s?1,234\.50|US\$\s?1,234\.50/u);
    });
    it("maneja string y NaN", () => {
      expect(formatCurrency("999.1", "PEN")).toMatch(/999\.10/);
      expect(formatCurrency("abc", "PEN")).toBe("PEN 0.00");
    });
    it("fallback/representación para moneda desconocida", () => {
      // Moneda inventada: algunos entornos Intl muestran '¤', otros lanzan y usamos fallback
      const out = formatCurrency(10, "XXX");
      expect(out).toMatch(/(XXX|¤)\s?10\.00/);
    });
  });

  describe("formatNumber", () => {
    it("respeta decimales", () => {
      expect(formatNumber(1000.129, 2)).toMatch(/1,000\.13/);
    });
    it("maneja string y NaN", () => {
      expect(formatNumber("12.3", 1)).toMatch(/12\.3/);
      expect(formatNumber("abc")).toBe("0");
    });
  });

  describe("formatPercentage", () => {
    it("formatea % con divisor de 100", () => {
      const s = formatPercentage(25);
      expect(s).toMatch(/25(\.0+)?%|25,0+%/);
    });
    it("string y NaN", () => {
      expect(formatPercentage("12.5", 1)).toMatch(/12\.5%|12,5%/);
      expect(formatPercentage("abc")).toBe("0%");
    });
  });

  describe("formatDate", () => {
    it("fecha válida", () => {
      const s = formatDate("2024-01-02T10:20:00Z");
      expect(typeof s).toBe("string");
      expect(s).not.toBe("Fecha inválida");
    });
    it("fecha inválida", () => {
      expect(formatDate("not a date")).toBe("Fecha inválida");
    });
  });

  describe("formatTime", () => {
    it("minutos a h:mm", () => {
      expect(formatTime(125)).toBe("2:05");
      expect(formatTime(-5)).toBe("0:00");
    });
  });

  describe("formatBytes", () => {
    it("varias unidades", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });
  });

  describe("truncateText", () => {
    it("no trunca corto", () => {
      expect(truncateText("hola", 10)).toBe("hola");
    });
    it("trunca largo", () => {
      const s = truncateText("a".repeat(10), 5);
      expect(s).toBe("aa...");
    });
  });

  describe("capitalize", () => {
    it("capitaliza", () => {
      expect(capitalize("hOLA")) .toBe("Hola");
      expect(capitalize("")).toBe("");
    });
  });

  describe("conversión decimal/porcentaje", () => {
    it("decimalToPercentage", () => {
      expect(decimalToPercentage(0.25)).toBe(25);
      expect(decimalToPercentage("0.5")).toBe(50);
      expect(decimalToPercentage("abc")).toBe(0);
    });
    it("percentageToDecimal", () => {
      expect(percentageToDecimal(25)).toBe(0.25);
      expect(percentageToDecimal("50")).toBe(0.5);
      expect(percentageToDecimal("abc")).toBe(0);
    });
  });
});
