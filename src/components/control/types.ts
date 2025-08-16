export type SeriePoint = { day: string; horas: number };

export type MachineRow = { maquina: string; horas: number };

export type OperatorRow = { usuario: string; horas: number };

export type WIPRow = {
  id: string;
  codigo: string;
  estado: "OPEN" | "IN_PROGRESS" | "DRAFT" | "DONE" | "CANCELLED";
  prioridad: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  clienteNombre: string | null;
  piezasPlan: number;
  piezasHechas: number;
  avancePct: number;
  creadaEn: string | Date;
};

export type Overview = {
  series: SeriePoint[];
  machines: MachineRow[];
  operators: OperatorRow[];
  wip: WIPRow[];
  kpis: {
    horasUlt7d: number;
    horasHoy: number;
    otsOpen: number;
    otsInProgress: number;
    piezasPlan: number;
    piezasHechas: number;
    avanceGlobalPct: number;
  };
  from: Date;
  until: Date;
};

export type QuickLogPieza = {
  id: string;
  titulo: string;
  pend: number;
};

export type QuickLogOT = {
  id: string;
  codigo: string;
  estado: "OPEN" | "IN_PROGRESS" | "DRAFT" | "DONE" | "CANCELLED";
  piezas: QuickLogPieza[];
};

export type QuickLog = {
  ots: QuickLogOT[];
  operadores: { id: string; nombre: string; email?: string | null }[];
  maquinas: { id: string; nombre: string }[];
};

export type Actions = {
  logProduction: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
  logFinishedPieces: (fd: FormData) => Promise<{ok:boolean; message?:string}>;
};
