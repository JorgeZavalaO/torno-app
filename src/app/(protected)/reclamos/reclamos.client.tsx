'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CreateReclamoDialog from './components/CreateReclamoDialog';
import ApproveReclamoDialog from './components/ApproveReclamoDialog';
import ReclamoDetailDialog from './components/ReclamoDetailDialog';
import ReclamosFilters from './components/ReclamosFilters';
import ReclamosList from './components/ReclamosList';
import RecentOTs from './components/RecentOTs';

interface Reclamo {
  id: string;
  codigo?: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  categoria?: string;
  tipoReclamo: string;
  otReferenciaId?: string;
  tipoResolucion?: string;
  createdAt: string;
  cliente?: {
    id: string;
    nombre: string;
  } | null;
  otReferencia?: {
    id: string;
    codigo: string;
  };
}

interface OT {
  id: string;
  codigo: string;
  estado: string;
  prioridad: string;
  cliente?: { nombre: string } | null;
  createdAt: string;
}

interface ReclamosData {
  reclamos: Reclamo[];
  total: number;
  page: number;
  pageSize: number;
}

interface ReclamosClientProps {
  canWrite: boolean;
  canApprove: boolean;
}

interface CreateReclamoForm {
  clienteId: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  categoria: string;
  tipoReclamo: string;
  otReferenciaId: string;
  archivos: string[];
}

export default function ReclamosClient({ canWrite, canApprove }: ReclamosClientProps) {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [page] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReclamo, setSelectedReclamo] = useState<Reclamo | null>(null);
  const [ots, setOts] = useState<OT[]>([]);
  const [otsLoading, setOtsLoading] = useState(false);
  const [clientes, setClientes] = useState<{id: string, nombre: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReclamosData | null>(null);

  const fetchReclamos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(search && { q: search }),
        ...(estadoFilter && { estado: estadoFilter }),
        ...(clienteFilter && { clienteId: clienteFilter }),
      });

      const res = await fetch(`/api/reclamos?${params}`);
      if (!res.ok) throw new Error('Error al cargar reclamos');
      const data = await res.json();
      setData(data);
    } catch {
      toast.error('Error al cargar reclamos');
    } finally {
      setLoading(false);
    }
  }, [page, search, estadoFilter, clienteFilter]);

  const fetchOts = useCallback(async () => {
    setOtsLoading(true);
    try {
      const res = await fetch('/api/ots?page=1&pageSize=20');
      if (!res.ok) throw new Error('Error al cargar OTs');
      const data = await res.json();
      // Filtrar OTs con ID y código válidos
      const otsValidas = (data.rows || []).filter((ot: OT) => ot.id?.trim() && ot.codigo?.trim());
      setOts(otsValidas);
    } catch {
      toast.error('Error al cargar órdenes de trabajo');
    } finally {
      setOtsLoading(false);
    }
  }, []);

  const fetchClientes = useCallback(async () => {
    try {
      const res = await fetch('/api/clientes?page=1&pageSize=50');
      if (!res.ok) throw new Error('Error al cargar clientes');
      const data = await res.json();
      setClientes(data.clientes || []);
    } catch {
      toast.error('Error al cargar clientes');
    }
  }, []);

  const handleEstadoChange = async (reclamoId: string, nuevoEstado: string, tipoResolucion?: string, notasResolucion?: string) => {
    try {
      const body: { estado: string; tipoResolucion?: string; notasResolucion?: string } = { estado: nuevoEstado };
      if (tipoResolucion) body.tipoResolucion = tipoResolucion;
      if (notasResolucion) body.notasResolucion = notasResolucion;

      const res = await fetch(`/api/reclamos/${reclamoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al actualizar estado');

      toast.success('Estado actualizado');
      fetchReclamos();
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handleConvertToOT = async (reclamoId: string) => {
    try {
      const res = await fetch(`/api/reclamos/${reclamoId}/convert-ot`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Error al convertir a OT');

      const data = await res.json();
      toast.success(data.message);
      fetchReclamos();
    } catch {
      toast.error('Error al convertir a OT');
    }
  };

  const handleCreateReclamo = async (formData: CreateReclamoForm, files: File[]) => {
    try {
      // Validación de archivos antes de procesar
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`El archivo "${file.name}" excede el límite de 2MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          throw new Error(`El archivo "${file.name}" no es un tipo permitido. Solo JPG, PNG, WebP o PDF.`);
        }
      }

      // helper to read file as base64 (data URL stripped)
      const readAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // strip prefix data:*/*;base64,
          const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
          resolve(base64);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      // Si hay archivos locales, subirlos primero
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        const filesPayload = await Promise.all(files.map(async (f) => {
          const base64 = await readAsBase64(f);
          return { 
            name: f.name, 
            base64,
            mimeType: f.type,
            size: f.size
          };
        }));

        const upRes = await fetch('/api/uploads/reclamos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesPayload }),
        });
        if (!upRes.ok) {
          const upErr = await upRes.json().catch(() => ({}));
          throw new Error(upErr?.error || 'Error al subir archivos');
        }
        const upData = await upRes.json();
        uploadedUrls = upData.files || [];
      }

      const payload = { ...formData, archivos: uploadedUrls };
      const res = await fetch('/api/reclamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Error al crear reclamo');
      }

      toast.success('Reclamo creado exitosamente');
      fetchReclamos();
    } catch (errUnknown) {
      const err = errUnknown as unknown as { message?: string };
      console.error('Create reclamo error', errUnknown);
      toast.error(err.message || 'Error al crear reclamo');
      throw err; // Re-throw to let the dialog handle it
    }
  };

  useEffect(() => {
    fetchReclamos();
  }, [fetchReclamos]);

  useEffect(() => {
    fetchOts();
    fetchClientes();
  }, [fetchOts, fetchClientes]);

  return (
    <div className="space-y-6">
      {/* Header con botón de crear */}
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Reclamo
          </Button>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <ReclamosFilters
        search={search}
        onSearchChange={setSearch}
        estadoFilter={estadoFilter}
        onEstadoFilterChange={setEstadoFilter}
        clienteFilter={clienteFilter}
        onClienteFilterChange={setClienteFilter}
        clientes={clientes}
      />

      {/* Lista de reclamos */}
      <ReclamosList
        reclamos={data?.reclamos || []}
        loading={loading}
        canApprove={canApprove}
        onViewDetail={(reclamo: Reclamo) => {
          setSelectedReclamo(reclamo);
          setShowDetailDialog(true);
        }}
        onEstadoChange={handleEstadoChange}
        onConvertToOT={handleConvertToOT}
        onApprove={(reclamo: Reclamo) => {
          setSelectedReclamo(reclamo);
          setShowApproveDialog(true);
        }}
      />

      {/* Órdenes de trabajo recientes */}
      <RecentOTs
        ots={ots}
        loading={otsLoading}
      />

      {/* Diálogos */}
      <CreateReclamoDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        clientes={clientes}
        ots={ots}
        onCreate={handleCreateReclamo}
      />

      <ApproveReclamoDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        reclamo={selectedReclamo}
        onApprove={(tipo: string, notas: string) => {
          if (selectedReclamo) {
            handleEstadoChange(selectedReclamo.id, 'APPROVED', tipo, notas);
            setShowApproveDialog(false);
          }
        }}
      />

      <ReclamoDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        reclamo={selectedReclamo}
        canApprove={canApprove}
        onApprove={() => {
          setShowDetailDialog(false);
          setShowApproveDialog(true);
        }}
      />
    </div>
  );
}