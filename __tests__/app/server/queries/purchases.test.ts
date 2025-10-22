import { getSCsCached, getOCsCached } from "@/app/server/queries/purchases";

jest.mock("@/app/lib/prisma", () => ({
  prisma: {
    proveedor: { findMany: jest.fn() },
    solicitudCompra: { findMany: jest.fn() },
    oCItem: { groupBy: jest.fn() },
    ordenCompra: { findMany: jest.fn() },
    movimiento: { findMany: jest.fn() },
  },
}));

const { prisma } = jest.requireMock("@/app/lib/prisma");

describe("purchases queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getSCsCached calcula pendientes por item y totales", async () => {
    prisma.solicitudCompra.findMany.mockResolvedValue([
      {
        id: "SC1",
        estado: "ABIERTO",
        createdAt: new Date("2024-01-01"),
        solicitante: { id: "U1", email: "u@x", displayName: "User" },
        totalEstimado: 100,
        notas: null,
        ordenesCompra: [{ id: "oc1", codigo: "OC-1", estado: "ABIERTA" }],
        items: [
          { id: "I1", productoId: "P1", cantidad: 10, costoEstimado: 2, producto: { nombre: "Prod1", uom: "UN" } },
          { id: "I2", productoId: "P2", cantidad: 5, costoEstimado: 3, producto: { nombre: "Prod2", uom: "KG" } },
        ],
      },
    ]);

    prisma.oCItem.groupBy.mockResolvedValue([
      { scItemId: "I1", _sum: { cantidad: 4 } },
      { scItemId: "I2", _sum: { cantidad: 1 } },
    ]);

    const rows = await getSCsCached();
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.items[0]).toMatchObject({ cubierto: 4, pendiente: 6 });
    expect(r.items[1]).toMatchObject({ cubierto: 1, pendiente: 4 });
    expect(r.orderedTotal).toBe(5);
    expect(r.pendingTotal).toBe(10 + 5 - 5);
  });

  it("getOCsCached calcula pendientes por item y total", async () => {
    prisma.ordenCompra.findMany.mockResolvedValue([
      {
        id: "1",
        codigo: "OC-1",
        estado: "ABIERTA",
        fecha: new Date("2024-01-02"),
        total: 100,
        proveedor: { id: "PV1", nombre: "Prov", ruc: "RUC" },
        solicitudCompra: { id: "SC1" },
        items: [
          { id: "i1", productoId: "P1", cantidad: 10, costoUnitario: 2, producto: { nombre: "Prod1", uom: "UN" } },
          { id: "i2", productoId: "P2", cantidad: 3, costoUnitario: 5, producto: { nombre: "Prod2", uom: "KG" } },
        ],
        _count: {},
      },
    ]);

    prisma.movimiento.findMany.mockResolvedValue([
      { refId: "OC-1", productoId: "P1", cantidad: 6 },
      { refId: "OC-1", productoId: "P2", cantidad: 1 },
    ]);

    const rows = await getOCsCached();
    expect(rows).toHaveLength(1);
  const r = rows[0];
  // Conservamos el orden original de items
  const p1 = r.items[0];
  const p2 = r.items[1];
  expect(p1).toMatchObject({ productoId: "P1", pendiente: 4, importe: 20 });
  expect(p2).toMatchObject({ productoId: "P2", pendiente: 2, importe: 15 });
    expect(r.pendienteTotal).toBe(4 + 2);
  });
});
