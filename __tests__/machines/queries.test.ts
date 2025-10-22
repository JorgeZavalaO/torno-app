import { describe, it, expect, beforeEach } from '@jest/globals';
import { getMachinesCached, getMachineDetail } from '@/app/server/queries/machines';

// Mock Prisma para testing
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    maquina: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    maquinaEvento: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    maquinaMantenimiento: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

// Import after mock to get the mocked version
import { prisma } from '@/app/lib/prisma';

// Type the mocked prisma with explicit mock types
const mockPrisma = {
  maquina: {
    findMany: prisma.maquina.findMany as jest.Mock,
    findUnique: prisma.maquina.findUnique as jest.Mock,
  },
  maquinaEvento: {
    groupBy: prisma.maquinaEvento.groupBy as jest.Mock,
    findMany: prisma.maquinaEvento.findMany as jest.Mock,
  },
  maquinaMantenimiento: {
    groupBy: prisma.maquinaMantenimiento.groupBy as jest.Mock,
    findMany: prisma.maquinaMantenimiento.findMany as jest.Mock,
  },
  $queryRaw: prisma.$queryRaw as jest.Mock,
};

describe('Machines Queries', () => {
  const fixedNow = new Date('2025-09-12T00:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getMachinesCached', () => {
    it('should return machines with all metrics calculated', async () => {
      // Mock data
      const mockMaquinas = [
        {
          id: 'maq-1',
          codigo: 'T001',
          nombre: 'Torno CNC 1',
          categoria: 'CNC',
          estado: 'ACTIVA',
          ubicacion: 'Área A',
        },
      ];

      const mockEventos30d = [
        { maquinaId: 'maq-1', _sum: { horas: 120.5 } },
      ];

      const mockPendientes = [
        { maquinaId: 'maq-1', _count: { _all: 2 } },
      ];

      const mockFallas30d = [
        { maquinaId: 'maq-1', _count: { _all: 3 } }, // 3 paradas por fallas
      ];

      const mockAverias30d = [
        { maquinaId: 'maq-1', _count: { _all: 1 } }, // 1 avería específica
      ];

      const mockCostos30d = [
        { maquinaId: 'maq-1', _sum: { costo: 1500.0 } },
      ];

      const mockProximosMantenimientos = [
        {
          id: 'mant-1',
          maquinaId: 'maq-1',
          fechaProg: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          estado: 'PENDIENTE',
        },
      ];

      const mockUltimosEventos = [
        {
          maquinaId: 'maq-1',
          tipo: 'USO',
          inicio: new Date('2025-09-11T10:00:00Z'),
          fin: new Date('2025-09-11T14:00:00Z'),
        },
      ];

      // Configure mocks
      mockPrisma.maquina.findMany.mockResolvedValue(mockMaquinas);
      mockPrisma.maquinaEvento.groupBy
        .mockResolvedValueOnce(mockEventos30d)
        .mockResolvedValueOnce(mockFallas30d)
        .mockResolvedValueOnce(mockAverias30d);
      mockPrisma.maquinaMantenimiento.groupBy
        .mockResolvedValueOnce(mockPendientes)
        .mockResolvedValueOnce(mockCostos30d);
      mockPrisma.maquinaMantenimiento.findMany.mockResolvedValue(mockProximosMantenimientos);
      mockPrisma.$queryRaw.mockResolvedValue(mockUltimosEventos);

      // Execute
      const result = await getMachinesCached();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'maq-1',
        codigo: 'T001',
        nombre: 'Torno CNC 1',
        categoria: 'CNC',
        estado: 'ACTIVA',
        ubicacion: 'Área A',
        horasUlt30d: 120.5,
        pendMant: 2,
        paradasPorFallas30d: 3, // Nueva métrica
        averias30d: 1, // Nueva métrica
        costoMant30d: 1500.0, // Nueva métrica
      });

      // Verificar que horasParaSigMant está calculado correctamente (aproximadamente 7 días = 168 horas)
      expect(result[0].horasParaSigMant).toBeGreaterThan(160);
      expect(result[0].horasParaSigMant).toBeLessThan(170);

      expect(result[0].ultimoEvento).toMatchObject({
        tipo: 'USO',
        inicio: expect.any(Date),
        fin: expect.any(Date),
      });
    });

    it('should handle machines without events or maintenance', async () => {
      const mockMaquinas = [
        {
          id: 'maq-2',
          codigo: 'T002',
          nombre: 'Torno Manual 2',
          categoria: 'Manual',
          estado: 'ACTIVA',
          ubicacion: null,
        },
      ];

      // No events, maintenance, or costs
      mockPrisma.maquina.findMany.mockResolvedValue(mockMaquinas);
      mockPrisma.maquinaEvento.groupBy
        .mockResolvedValueOnce([]) // eventos30d
        .mockResolvedValueOnce([]) // fallas30d
        .mockResolvedValueOnce([]); // averias30d
      mockPrisma.maquinaMantenimiento.groupBy
        .mockResolvedValueOnce([]) // pendientes
        .mockResolvedValueOnce([]); // costos30d
      mockPrisma.maquinaMantenimiento.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await getMachinesCached();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'maq-2',
        codigo: 'T002',
        nombre: 'Torno Manual 2',
        horasUlt30d: 0,
        pendMant: 0,
        paradasPorFallas30d: 0, // Sin paradas
        averias30d: 0, // Sin averías
        horasParaSigMant: null, // Sin mantenimiento programado
        costoMant30d: 0, // Sin costos
        ultimoEvento: null,
      });
    });
  });

  describe('getMachineDetail', () => {
    it('should return detailed machine information with KPIs', async () => {
      const mockMaquina = {
        id: 'maq-1',
        codigo: 'T001',
        nombre: 'Torno CNC 1',
        categoria: 'CNC',
        estado: 'ACTIVA',
        ubicacion: 'Área A',
      };

      const mockEventos = [
        {
          id: 'ev-1',
          maquinaId: 'maq-1',
          tipo: 'USO',
          inicio: new Date('2025-09-10T08:00:00Z'),
          fin: new Date('2025-09-10T16:00:00Z'),
          horas: 8,
          nota: 'Producción normal',
          ot: { codigo: 'OT001' },
          usuario: { displayName: 'Juan Pérez', email: 'juan@example.com' },
        },
        {
          id: 'ev-2',
          maquinaId: 'maq-1',
          tipo: 'AVERIA',
          inicio: new Date('2025-09-09T10:00:00Z'),
          fin: new Date('2025-09-09T12:00:00Z'),
          horas: 2,
          nota: 'Falla en husillo',
          ot: null,
          usuario: { displayName: 'María García', email: 'maria@example.com' },
        },
        {
          id: 'ev-3',
          maquinaId: 'maq-1',
          tipo: 'PARO',
          inicio: new Date('2025-09-08T14:00:00Z'),
          fin: new Date('2025-09-08T15:00:00Z'),
          horas: 1,
          nota: 'Paro por falla eléctrica',
          ot: null,
          usuario: { displayName: 'Carlos López', email: 'carlos@example.com' },
        },
      ];

      const mockMantenimientos = [
        {
          id: 'mant-1',
          maquinaId: 'maq-1',
          tipo: 'PREVENTIVO',
          estado: 'PENDIENTE',
          fechaProg: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
          fechaReal: null,
          costo: 0,
          nota: 'Mantenimiento preventivo programado',
        },
        {
          id: 'mant-2',
          maquinaId: 'maq-1',
          tipo: 'CORRECTIVO',
          estado: 'COMPLETADO',
          fechaProg: new Date('2025-09-05T09:00:00Z'),
          fechaReal: new Date('2025-09-05T11:00:00Z'),
          costo: 800,
          nota: 'Reparación de husillo',
        },
      ];

      const mockSerie30d = [
        { day: '2025-09-10', horas: 8 },
        { day: '2025-09-09', horas: 2 },
        { day: '2025-09-08', horas: 1 },
      ];

      mockPrisma.maquina.findUnique.mockResolvedValue(mockMaquina);
      mockPrisma.maquinaEvento.findMany.mockResolvedValue(mockEventos);
      mockPrisma.maquinaMantenimiento.findMany.mockResolvedValue(mockMantenimientos);
      mockPrisma.$queryRaw.mockResolvedValue(mockSerie30d);

      const result = await getMachineDetail('maq-1');

      expect(result).not.toBeNull();
      expect(result!.maquina).toMatchObject(mockMaquina);
      expect(result!.eventos).toHaveLength(3);
      expect(result!.mantenimientos).toHaveLength(2);
      expect(result!.serie30d).toHaveLength(3);

      // Verificar KPIs calculados
      expect(result!.kpis).toMatchObject({
        horas30d: 11, // 8 + 2 + 1
        usoPctAprox: expect.any(Number),
        pendMant: 1, // 1 pendiente
        paradasPorFallas30d: 2, // 1 AVERIA + 1 PARO
        averias30d: 1, // Solo 1 AVERIA
        costoMant30d: 800, // Solo el completado en los últimos 30 días
      });

      // Verificar que horasParaSigMant está calculado (aproximadamente 3 días = 72 horas)
      expect(result!.kpis.horasParaSigMant).toBeGreaterThan(70);
      expect(result!.kpis.horasParaSigMant).toBeLessThan(75);
    });

    it('should return null for non-existent machine', async () => {
      mockPrisma.maquina.findUnique.mockResolvedValue(null);

      const result = await getMachineDetail('non-existent');

      expect(result).toBeNull();
    });
  });
});