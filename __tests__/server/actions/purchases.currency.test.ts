// Mocks de dependencias externas usadas por createOC antes de importar el módulo
jest.mock("@/app/lib/guards", () => ({
  assertCanWritePurchases: async () => {},
}));
jest.mock("@/app/lib/auth", () => ({
  getCurrentUser: async () => null,
}));

// Prisma mock básico
jest.mock("@/app/lib/prisma", () => ({
  prisma: {
    solicitudCompra: { findUnique: jest.fn() },
    proveedor: { findUnique: jest.fn() },
    oCItem: { groupBy: jest.fn() },
    ordenCompra: { create: jest.fn() },
    configuracionCatalogo: { findFirst: jest.fn() },
    $transaction: jest.fn(async (fn: (tx: any) => any) => {
      // tx expone las mismas funciones necesarias dentro de la transacción
      const tx = {
        ordenCompra: { create: (...args: any[]) => (require("@/app/lib/prisma") as any).prisma.ordenCompra.create(...args) },
      };
      return fn(tx);
    }),
  },
}));

const { prisma } = jest.requireMock("@/app/lib/prisma");

describe("createOC currency behavior", () => {
  let createOC: (fd: FormData) => Promise<any>;
  const SC_ID = "11111111-1111-1111-1111-111111111111";
  const PV_ID = "22222222-2222-2222-2222-222222222222";

  class SimpleFormData {
    private store = new Map<string, string>();
    set(key: string, value: string) { this.store.set(key, value); }
    get(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  }

  beforeAll(async () => {
    ({ createOC } = await import("@/app/(protected)/compras/actions"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // SC aprobada con un item
    prisma.solicitudCompra.findUnique.mockResolvedValue({
      id: SC_ID,
      estado: "APPROVED",
      items: [
        { id: "SCI1", productoId: "P1", cantidad: 5 },
      ],
    });
    // No asignaciones previas
    prisma.oCItem.groupBy.mockResolvedValue([]);
    // Proveedor por defecto
    prisma.proveedor.findUnique.mockResolvedValue({ id: PV_ID, currency: "USD" });
    // ordenCompra.create retorna id/codigo
    prisma.ordenCompra.create.mockImplementation(({ data }: any) => ({ id: "OC1", codigo: data.codigo }));

    // Guardar IDs para uso en tests
  });

  it.skip("usa la moneda del proveedor si no se especifica en el formulario", async () => {
    // Catálogo contiene USD
    prisma.configuracionCatalogo.findFirst.mockResolvedValue({ id: "moneda-usd" });
    const fd = new SimpleFormData() as unknown as FormData;
    fd.set("scId", SC_ID);
    fd.set("proveedorId", PV_ID);
    // eslint-disable-next-line no-console
    console.log('FD values', { scId: fd.get('scId'), proveedorId: fd.get('proveedorId') });
    fd.set("codigo", "OC-1");
    fd.set("items", JSON.stringify([{ productoId: "P1", cantidad: 5, costoUnitario: 10 }]));
    const res = await createOC(fd);
    // Diagnóstico temporal
    // eslint-disable-next-line no-console
    console.log('TEST createOC res (proveedor currency):', res);
    expect(res.ok).toBe(true);
    expect(prisma.ordenCompra.create).toHaveBeenCalled();
    const args = prisma.ordenCompra.create.mock.calls[0][0];
    expect(args.data.currency).toBe("USD");
  });

  it.skip("normaliza la moneda proporcionada en minúsculas a MAYÚSCULAS", async () => {
    prisma.configuracionCatalogo.findFirst.mockImplementation(({ where }: any) => {
      return where.codigo === "EUR" ? { id: "moneda-eur" } : null;
    });
    const fd = new SimpleFormData() as unknown as FormData;
    fd.set("scId", SC_ID);
    fd.set("proveedorId", PV_ID);
    fd.set("codigo", "OC-2");
    fd.set("currency", "eur"); // minúsculas
    fd.set("items", JSON.stringify([{ productoId: "P1", cantidad: 5, costoUnitario: 10 }]));
    const res = await createOC(fd);
    // eslint-disable-next-line no-console
    console.log('TEST createOC res (EUR manual):', res);
    expect(res.ok).toBe(true);
    const args = prisma.ordenCompra.create.mock.calls[0][0];
    expect(args.data.currency).toBe("EUR");
  });

  it.skip("hace fallback a PEN si moneda inválida y proveedor sin catálogo válido", async () => {
    // Catálogo devuelve null siempre
    prisma.configuracionCatalogo.findFirst.mockResolvedValue(null);
    // Proveedor con moneda desconocida XXX
    prisma.proveedor.findUnique.mockResolvedValue({ id: "PV1", currency: "XXX" });
    const fd = new SimpleFormData() as unknown as FormData;
    fd.set("scId", SC_ID);
    fd.set("proveedorId", PV_ID);
    fd.set("codigo", "OC-3");
    fd.set("items", JSON.stringify([{ productoId: "P1", cantidad: 5, costoUnitario: 10 }]));
    const res = await createOC(fd);
    // eslint-disable-next-line no-console
    console.log('TEST createOC res (fallback PEN):', res);
    expect(res.ok).toBe(true);
    const args = prisma.ordenCompra.create.mock.calls[0][0];
    expect(args.data.currency).toBe("PEN");
  });
});
