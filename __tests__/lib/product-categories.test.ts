import CATEGORIES, { CategoryEnum, CATEGORY_PREFIX } from "@/lib/product-categories";

describe("product-categories", () => {
  it("enum valida categorías válidas", () => {
    for (const c of CATEGORIES) {
      expect(CategoryEnum.parse(c)).toBe(c);
    }
  });

  it("enum rechaza inválidos", () => {
    expect(() => CategoryEnum.parse("INVALIDA")).toThrow();
  });

  it("prefijos mapean correctamente", () => {
    expect(CATEGORY_PREFIX.MATERIA_PRIMA).toBe("MP");
    expect(CATEGORY_PREFIX.FABRICACION).toBe("FB");
  });

  it("export default contiene todas", () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
    expect(CATEGORIES).toContain("MATERIA_PRIMA");
  });
});
