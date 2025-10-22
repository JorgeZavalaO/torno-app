'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Search, CheckCircle, XCircle, ArrowRight, Eye, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';

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

export default function ReclamosClient({ canWrite, canApprove }: ReclamosClientProps) {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [page] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReclamo, setSelectedReclamo] = useState<Reclamo | null>(null);
  const [tipoResolucion, setTipoResolucion] = useState('');
  const [notasResolucion, setNotasResolucion] = useState('');
  const [ots, setOts] = useState<OT[]>([]);
  const [otsLoading, setOtsLoading] = useState(false);
  const [clientes, setClientes] = useState<{id: string, nombre: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReclamosData | null>(null);

  // Estado para formulario de creación
  const [createForm, setCreateForm] = useState({
    clienteId: '',
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA',
    categoria: '',
    tipoReclamo: 'NUEVO_RECLAMO',
    otReferenciaId: '',
  });

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

  const handleCreateReclamo = async () => {
    // Validación adicional
    if (createForm.tipoReclamo === 'OT_ATENDIDA' && !createForm.otReferenciaId) {
      toast.error('Debe seleccionar una OT de referencia para reclamos sobre OTs atendidas');
      return;
    }

    try {
      const res = await fetch('/api/reclamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) throw new Error('Error al crear reclamo');

      toast.success('Reclamo creado exitosamente');
      setShowCreateDialog(false);
      setCreateForm({
        clienteId: '',
        titulo: '',
        descripcion: '',
        prioridad: 'MEDIA',
        categoria: '',
        tipoReclamo: 'NUEVO_RECLAMO',
        otReferenciaId: '',
      });
      fetchReclamos();
    } catch {
      toast.error('Error al crear reclamo');
    }
  };

  useEffect(() => {
    fetchReclamos();
  }, [fetchReclamos]);

  useEffect(() => {
    fetchOts();
    fetchClientes();
  }, [fetchOts, fetchClientes]);

  const getEstadoBadge = (estado: string) => {
    const variants = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED_TO_OT: 'bg-purple-100 text-purple-800',
    };
    return variants[estado as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getPrioridadBadge = (prioridad: string) => {
    const variants = {
      BAJA: 'bg-gray-100 text-gray-800',
      MEDIA: 'bg-yellow-100 text-yellow-800',
      ALTA: 'bg-orange-100 text-orange-800',
      URGENTE: 'bg-red-100 text-red-800',
    };
    return variants[prioridad as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

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

  const exportToPDF = async (reclamo: Reclamo) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Configurar fuentes
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(37, 99, 235); // Azul
      pdf.text('DETALLE DE RECLAMO', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Código de reclamo
      if (reclamo.codigo) {
        pdf.setDrawColor(37, 99, 235);
        pdf.setFillColor(239, 246, 255);
        pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
        pdf.setFont('Courier', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(25, 55, 155);
        pdf.text(reclamo.codigo, pageWidth / 2, yPosition + 2, { align: 'center' });
        yPosition += 15;
      }

      // Línea separadora
      pdf.setDrawColor(229, 231, 235);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 12;

      // INFORMACIÓN GENERAL
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(55, 65, 81);
      pdf.text('INFORMACIÓN GENERAL', 20, yPosition);
      yPosition += 8;

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(10);
      const generalInfo = [
        [`Título: `, reclamo.titulo],
        [`Cliente: `, reclamo.cliente?.nombre || 'Cliente desconocido'],
        [`Tipo: `, reclamo.tipoReclamo.replace('_', ' ')],
        ...(reclamo.categoria ? [[`Categoría: `, reclamo.categoria]] : []),
      ];

      for (const [label, value] of generalInfo) {
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(label, 20, yPosition);
        
        pdf.setFont('Helvetica', 'normal');
        const textWidth = pdf.getTextWidth(label);
        
        // Manejar texto largo que se desborde
        const maxWidth = pageWidth - 40 - textWidth;
        const lines = pdf.splitTextToSize(String(value), maxWidth);
        pdf.text(lines, 20 + textWidth, yPosition);
        yPosition += 6 + (lines.length - 1) * 4;
      }

      yPosition += 6;

      // ESTADO Y PRIORIDAD
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('ESTADO Y PRIORIDAD', 20, yPosition);
      yPosition += 8;

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(10);
      const statusInfo = [
        [`Estado: `, reclamo.estado.replace('_', ' ')],
        [`Prioridad: `, reclamo.prioridad],
        [`Fecha de Creación: `, new Date(reclamo.createdAt).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })],
        ...(reclamo.otReferencia ? [[`OT de Referencia: `, reclamo.otReferencia.codigo]] : []),
      ];

      for (const [label, value] of statusInfo) {
        pdf.setFont('Helvetica', 'bold');
        pdf.text(label, 20, yPosition);
        
        pdf.setFont('Helvetica', 'normal');
        const textWidth = pdf.getTextWidth(label);
        pdf.text(String(value), 20 + textWidth, yPosition);
        yPosition += 6;
      }

      yPosition += 6;

      // Línea separadora
      pdf.setDrawColor(229, 231, 235);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // DESCRIPCIÓN
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('DESCRIPCIÓN DEL RECLAMO', 20, yPosition);
      yPosition += 8;

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      
      // Manejo de texto largo en descripción
      const descriptionLines = pdf.splitTextToSize(reclamo.descripcion, pageWidth - 40);
      pdf.text(descriptionLines, 20, yPosition);
      yPosition += (descriptionLines.length * 4) + 8;

      // Verificar si necesitamos nueva página
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }

      // RESOLUCIÓN (si existe)
      if (reclamo.tipoResolucion) {
        pdf.setDrawColor(187, 247, 208);
        pdf.setFillColor(240, 253, 244);
        pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
        
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(22, 101, 52);
        pdf.text('RESOLUCIÓN', 20, yPosition + 2);
        pdf.text(reclamo.tipoResolucion.replace('_', ' '), 70, yPosition + 2);
        yPosition += 15;
      }

      // Pie de página
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      const timestamp = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Reporte generado el ${timestamp}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text('Sistema de Gestión TornoApp', pageWidth / 2, pageHeight - 5, { align: 'center' });

      // Descargar
      const fileName = `reclamo-${reclamo.codigo || reclamo.id}.pdf`;
      pdf.save(fileName);

      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <div>
              <CardTitle>Filtros y Búsqueda</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Busca por: título, descripción, código de reclamo (REC-2025-0001) o código de OT</p>
            </div>
            {canWrite && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Reclamo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Reclamo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Cliente</label>
                        <Select
                          value={createForm.clienteId || "__none"}
                          onValueChange={(value) => {
                            if (value === "__none") {
                              setCreateForm(prev => ({ ...prev, clienteId: '' }));
                            } else {
                              setCreateForm(prev => ({ ...prev, clienteId: value }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {!createForm.clienteId && <SelectItem value="__none">Selecciona cliente</SelectItem>}
                            {clientes.filter(cliente => cliente.id && cliente.nombre).map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Tipo de Reclamo</label>
                        <Select
                          value={createForm.tipoReclamo}
                          onValueChange={(value) => setCreateForm(prev => ({ ...prev, tipoReclamo: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NUEVO_RECLAMO">Nuevo Reclamo</SelectItem>
                            <SelectItem value="OT_ATENDIDA">Sobre OT Atendida</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {createForm.tipoReclamo === 'OT_ATENDIDA' && (
                      <div>
                        <label className="text-sm font-medium">OT de Referencia</label>
                        <Select
                          value={createForm.otReferenciaId || "__none"}
                          onValueChange={(value) => {
                            if (value === "__none") {
                              setCreateForm(prev => ({ ...prev, otReferenciaId: '' }));
                            } else {
                              setCreateForm(prev => ({ ...prev, otReferenciaId: value }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona OT" />
                          </SelectTrigger>
                          <SelectContent>
                            {!createForm.otReferenciaId && <SelectItem value="__none">Selecciona OT</SelectItem>}
                            {ots.filter(ot => ot.id && ot.codigo && ot.cliente?.nombre).map((ot) => (
                              <SelectItem key={ot.id} value={ot.id}>
                                {ot.codigo} - {ot.cliente?.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Título</label>
                      <Input
                        value={createForm.titulo}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Título del reclamo"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Descripción</label>
                      <Textarea
                        value={createForm.descripcion}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Describe el problema o reclamo..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Prioridad</label>
                        <Select
                          value={createForm.prioridad}
                          onValueChange={(value) => setCreateForm(prev => ({ ...prev, prioridad: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BAJA">Baja</SelectItem>
                            <SelectItem value="MEDIA">Media</SelectItem>
                            <SelectItem value="ALTA">Alta</SelectItem>
                            <SelectItem value="URGENTE">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Categoría (opcional)</label>
                        <Input
                          value={createForm.categoria}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, categoria: e.target.value }))}
                          placeholder="Categoría del reclamo"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateReclamo}
                        disabled={!createForm.clienteId || !createForm.titulo || !createForm.descripcion || (createForm.tipoReclamo === 'OT_ATENDIDA' && !createForm.otReferenciaId)}
                      >
                        Crear Reclamo
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Modal de Aprobación */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aprobar Reclamo</DialogTitle>
                  <p className="text-sm text-gray-600">
                    Selecciona el tipo de resolución para el reclamo: <strong>{selectedReclamo?.titulo}</strong>
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Tipo de Resolución</label>
                    <Select value={tipoResolucion || "__none"} onValueChange={(value) => {
                      if (value === "__none") {
                        setTipoResolucion('');
                      } else {
                        setTipoResolucion(value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona resolución" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoResolucion === '' && <SelectItem value="__none">Selecciona resolución</SelectItem>}
                        <SelectItem value="OT_PENDIENTE">Regresar OT a pendiente</SelectItem>
                        <SelectItem value="OT_NUEVA">Crear nueva OT</SelectItem>
                        <SelectItem value="REEMBOLSO">Reembolso al cliente</SelectItem>
                        <SelectItem value="AJUSTE_STOCK">Ajuste en inventario</SelectItem>
                        <SelectItem value="OTRO">Otra resolución</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notas de Resolución (opcional)</label>
                    <Textarea
                      value={notasResolucion}
                      onChange={(e) => setNotasResolucion(e.target.value)}
                      placeholder="Detalles adicionales sobre la resolución..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedReclamo && tipoResolucion) {
                          handleEstadoChange(selectedReclamo.id, 'APPROVED', tipoResolucion, notasResolucion);
                          setShowApproveDialog(false);
                        }
                      }}
                      disabled={!tipoResolucion}
                    >
                      Aprobar Reclamo
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por titulo, descripcion, codigo (REC-XXXX) o codigo OT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  title="Puedes buscar por: título, descripción, código de reclamo (REC-2025-0001) u OT asociada"
                />
              </div>
            </div>
            <Select 
              value={clienteFilter} 
              onValueChange={(value) => {
                if (value === '__clear') {
                  setClienteFilter('');
                } else {
                  setClienteFilter(value);
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                {clienteFilter && <SelectItem value="__clear">Limpiar filtro</SelectItem>}
                {clientes.filter(cliente => cliente.id && cliente.nombre).map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={estadoFilter || "__none"} 
              onValueChange={(value) => {
                if (value === "__none") {
                  setEstadoFilter('');
                } else {
                  setEstadoFilter(value);
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {!estadoFilter && <SelectItem value="__none">Todos</SelectItem>}
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="UNDER_REVIEW">En Revisión</SelectItem>
                <SelectItem value="APPROVED">Aprobado</SelectItem>
                <SelectItem value="REJECTED">Rechazado</SelectItem>
                <SelectItem value="CONVERTED_TO_OT">Convertido a OT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de reclamos */}
      <Card>
        <CardHeader>
          <CardTitle>Reclamos ({data?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <div className="space-y-3">
              {data?.reclamos.map((reclamo) => (
                <div key={reclamo.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-base">{reclamo.titulo}</h3>
                        <Badge className={getPrioridadBadge(reclamo.prioridad)}>
                          {reclamo.prioridad}
                        </Badge>
                        <Badge className={getEstadoBadge(reclamo.estado)}>
                          {reclamo.estado.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{reclamo.cliente?.nombre || 'Cliente desconocido'}</p>
                      <p className="text-xs text-gray-500 mt-1">{reclamo.descripcion.substring(0, 100)}...</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedReclamo(reclamo);
                        setShowDetailDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>

                  <div className="flex justify-between items-center mb-3 pt-2 border-t">
                    <div className="flex gap-4 text-xs text-gray-500">
                      {reclamo.codigo && (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {reclamo.codigo}
                        </span>
                      )}
                      <span>Creado: {new Date(reclamo.createdAt).toLocaleDateString()}</span>
                      <span>Tipo: {reclamo.tipoReclamo.replace('_', ' ')}</span>
                      {reclamo.otReferencia && (
                        <span className="text-purple-600">OT Ref: {reclamo.otReferencia.codigo}</span>
                      )}
                    </div>
                  </div>

                  {canApprove && (
                    <div className="flex gap-2 flex-wrap">
                      {reclamo.estado === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedReclamo(reclamo);
                              setTipoResolucion('');
                              setNotasResolucion('');
                              setShowApproveDialog(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleEstadoChange(reclamo.id, 'REJECTED')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </>
                      )}
                      {reclamo.estado === 'APPROVED' && reclamo.tipoResolucion === 'OT_NUEVA' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleConvertToOT(reclamo.id)}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Crear OT
                        </Button>
                      )}
                      {reclamo.estado === 'APPROVED' && !reclamo.tipoResolucion && (
                        <div className="text-sm text-gray-600 italic">Esperando definir resolución</div>
                      )}
                      {reclamo.estado === 'UNDER_REVIEW' && (
                        <div className="text-sm text-blue-600">En revisión...</div>
                      )}
                      {reclamo.estado === 'REJECTED' && (
                        <div className="text-sm text-red-600">Rechazado</div>
                      )}
                      {reclamo.estado === 'CONVERTED_TO_OT' && (
                        <div className="text-sm text-green-600">✓ Convertido a OT</div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {data?.reclamos.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No se encontraron reclamos</p>
                  {canWrite && <p className="text-sm mt-2">Crea uno nuevo con el botón Nuevo Reclamo</p>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalles del Reclamo */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Reclamo</DialogTitle>
          </DialogHeader>
          {selectedReclamo && (
            <div className="space-y-4">
              {selectedReclamo.codigo && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <label className="text-sm font-medium text-blue-900">Código de Reclamo</label>
                  <p className="text-lg font-mono font-bold text-blue-900 mt-1">{selectedReclamo.codigo}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Título</label>
                  <p className="text-base font-semibold mt-1">{selectedReclamo.titulo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Cliente</label>
                  <p className="text-base mt-1">{selectedReclamo.cliente?.nombre || 'Cliente desconocido'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Estado</label>
                  <div className="mt-1">
                    <Badge className={getEstadoBadge(selectedReclamo.estado)}>
                      {selectedReclamo.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Prioridad</label>
                  <div className="mt-1">
                    <Badge className={getPrioridadBadge(selectedReclamo.prioridad)}>
                      {selectedReclamo.prioridad}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo de Reclamo</label>
                  <p className="text-sm mt-1">{selectedReclamo.tipoReclamo.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Descripción</label>
                <p className="text-sm mt-2 p-3 bg-gray-50 rounded border">{selectedReclamo.descripcion}</p>
              </div>

              {selectedReclamo.categoria && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Categoría</label>
                  <p className="text-sm mt-1">{selectedReclamo.categoria}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha de Creación</label>
                  <p className="text-sm mt-1">{new Date(selectedReclamo.createdAt).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
                {selectedReclamo.otReferencia && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">OT de Referencia</label>
                    <p className="text-sm mt-1 font-mono bg-blue-50 p-2 rounded">{selectedReclamo.otReferencia.codigo}</p>
                  </div>
                )}
              </div>

              {selectedReclamo.tipoResolucion && (
                <div className="bg-green-50 border border-green-200 p-3 rounded">
                  <label className="text-sm font-medium text-green-900">Tipo de Resolución</label>
                  <p className="text-sm mt-1 text-green-900">{selectedReclamo.tipoResolucion.replace('_', ' ')}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => selectedReclamo && exportToPDF(selectedReclamo)}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                {canApprove && selectedReclamo.estado === 'PENDING' && (
                  <Button
                    onClick={() => {
                      setShowDetailDialog(false);
                      setTipoResolucion('');
                      setNotasResolucion('');
                      setShowApproveDialog(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Revisar Reclamo
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sección de Órdenes de Trabajo */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo Recientes</CardTitle>
          <p className="text-sm text-gray-600">Seguimiento de pedidos y trabajos en proceso</p>
        </CardHeader>
        <CardContent>
          {otsLoading ? (
            <div className="text-center py-8">Cargando órdenes de trabajo...</div>
          ) : (
            <div className="space-y-4">
              {ots.slice(0, 10).map((ot) => (
                <div key={ot.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{ot.codigo}</h3>
                      <p className="text-sm text-gray-600">{ot.cliente?.nombre || 'Cliente desconocido'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getEstadoBadge(ot.estado)}>
                        {ot.estado.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPrioridadBadge(ot.prioridad)}>
                        {ot.prioridad}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Creada: {new Date(ot.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/ot/${ot.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </a>
                    </Button>
                  </div>
                </div>
              ))}

              {ots.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay órdenes de trabajo activas
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}