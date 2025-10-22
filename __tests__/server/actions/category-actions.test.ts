import { upsertCategoryAction, deleteCategoryAction, syncCategoriesFromMachines, convertCategoryCurrency } from "@/server/actions/category-actions";

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/app/server/queries/machine-costing-categories", () => ({
  upsertMachineCostingCategory: jest.fn(),
  deleteMachineCostingCategory: jest.fn(),
  getRegisteredMachineCategories: jest.fn(),
  getMachineCostingCategory: jest.fn(),
}));

jest.mock("@/app/lib/prisma", () => ({
  prisma: {
    machineCostingCategory: { findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const queries = jest.requireMock("@/app/server/queries/machine-costing-categories");
const { prisma } = jest.requireMock("@/app/lib/prisma");

describe("category-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upsertCategoryAction valida datos e invoca upsert", async () => {
    queries.upsertMachineCostingCategory.mockResolvedValue({ ok: true });
    const fd = new Map<string, string>([
      ["categoria", "CAT1"],
      ["laborCost", "2.5"],
      ["deprPerHour", "0.5"],
      ["descripcion", "desc"],
      ["activo", "true"],
    ]);

    const res = await upsertCategoryAction(fd as unknown as FormData);
    expect(res.ok).toBe(true);
    expect(queries.upsertMachineCostingCategory).toHaveBeenCalledWith({
      categoria: "CAT1",
      laborCost: 2.5,
      deprPerHour: 0.5,
      descripcion: "desc",
      activo: true,
    });
  });

  it("deleteCategoryAction valida e invoca delete", async () => {
    queries.deleteMachineCostingCategory.mockResolvedValue({ ok: true });
    const fd = new Map<string, string>([["categoria", "CAT1"]]);
    const res = await deleteCategoryAction(fd as unknown as FormData);
    expect(res.ok).toBe(true);
    expect(queries.deleteMachineCostingCategory).toHaveBeenCalledWith("CAT1");
  });

  it("syncCategoriesFromMachines crea faltantes", async () => {
    queries.getRegisteredMachineCategories.mockResolvedValue(["A", "B"]);
    queries.getMachineCostingCategory.mockResolvedValueOnce(null).mockResolvedValueOnce({ categoria: "B" });
    queries.upsertMachineCostingCategory.mockResolvedValue({ ok: true });

    const res = await syncCategoriesFromMachines();
    expect(res.ok).toBe(true);
    expect(res.created).toBe(1);
  });

  it("convertCategoryCurrency convierte valores y ejecuta transacción", async () => {
    prisma.machineCostingCategory.findMany.mockResolvedValue([
      { id: "1", laborCost: 10, deprPerHour: 2, activo: true },
      { id: "2", laborCost: 5, deprPerHour: 1, activo: true },
    ]);
    prisma.$transaction.mockResolvedValue(undefined);

    const res = await convertCategoryCurrency("USD", "PEN", 4);
    expect(res.ok).toBe(true);
    // Debe llamar a update por cada categoría
    // y luego a $transaction con ese arreglo
    expect(prisma.$transaction).toHaveBeenCalled();
    const updates = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(updates.length).toBe(2);
  });
});
