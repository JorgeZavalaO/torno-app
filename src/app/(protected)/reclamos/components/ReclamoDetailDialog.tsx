'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import { useEffect, useState } from 'react';

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
  archivos?: string[];
}

interface ReclamoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reclamo: Reclamo | null;
  canApprove: boolean;
  onApprove: () => void;
}

export default function ReclamoDetailDialog({
  open,
  onOpenChange,
  reclamo,
  canApprove,
  onApprove
}: ReclamoDetailDialogProps) {
  const [full, setFull] = useState<Reclamo | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open || !reclamo?.id) return setFull(null);
      // inicio carga
      try {
        const res = await fetch(`/api/reclamos/${reclamo.id}`);
        if (!res.ok) throw new Error('No se pudo cargar el reclamo');
        const data = await res.json();
        if (!mounted) return;
        setFull(data);
      } catch (err) {
        console.error('Error fetching reclamo detail', err);
      } finally {
        // fin carga
      }
    }
    load();
    return () => { mounted = false; };
  }, [open, reclamo]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setLightboxIndex(i => (full?.archivos ? Math.min((full.archivos.length || 1) - 1, i + 1) : i));
      if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(0, i - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, full]);
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

      // toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      // toast.error('Error al generar el PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="!w-[90vw] !max-w-6xl !max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Reclamo</DialogTitle>
        </DialogHeader>
        {reclamo && (
          <div className="space-y-4">
            {reclamo.codigo && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <label className="text-sm font-medium text-blue-900">Código de Reclamo</label>
                <p className="text-lg font-mono font-bold text-blue-900 mt-1">{reclamo.codigo}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Título</label>
                <p className="text-base font-semibold mt-1">{reclamo.titulo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Cliente</label>
                <p className="text-base mt-1">{reclamo.cliente?.nombre || 'Cliente desconocido'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Estado</label>
                <div className="mt-1">
                  <Badge className={getEstadoBadge(reclamo.estado)}>
                    {reclamo.estado.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Prioridad</label>
                <div className="mt-1">
                  <Badge className={getPrioridadBadge(reclamo.prioridad)}>
                    {reclamo.prioridad}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo de Reclamo</label>
                <p className="text-sm mt-1">{reclamo.tipoReclamo.replace('_', ' ')}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Descripción</label>
              <p className="text-sm mt-2 p-3 bg-gray-50 rounded border">{full?.descripcion ?? reclamo.descripcion}</p>
            </div>

            {/* Adjuntos */}
            {full?.archivos && full.archivos.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Adjuntos</label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {full.archivos.map((url, idx) => {
                    const isImage = /\.(jpe?g|png|webp)(\?.*)?$/i.test(url);
                    const isPDF = /\.pdf(\?.*)?$/i.test(url);
                    return (
                      <div key={idx} className="border rounded overflow-hidden bg-white">
                        {isImage ? (
                          <button
                            className="w-full h-36 bg-gray-100 hover:opacity-90"
                            onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Adjunto ${idx + 1}`} className="w-full h-36 object-cover" />
                          </button>
                        ) : isPDF ? (
                          <div className="p-3 flex flex-col items-center justify-center h-36">
                            <div className="text-4xl">📄</div>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline mt-2">Ver PDF</a>
                          </div>
                        ) : (
                          <div className="p-3 h-36 flex items-center justify-center">Adjunto</div>
                        )}

                        <div className="p-2 border-t flex items-center justify-between">
                          <a href={url} target="_blank" rel="noopener noreferrer" download className="text-sm text-gray-700 hover:text-gray-900">Abrir / Descargar</a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lightbox overlay */}
            {lightboxOpen && full?.archivos && full.archivos.length > 0 ? (
              (() => {
                const archivos = full.archivos || [];
                const url = archivos[lightboxIndex];
                const prev = () => setLightboxIndex(i => Math.max(0, i - 1));
                const next = () => setLightboxIndex(i => Math.min(archivos.length - 1, i + 1));
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="relative max-w-5xl w-full max-h-[90vh]">
                      <button onClick={() => setLightboxOpen(false)} className="absolute top-2 right-2 bg-white rounded-full p-2 shadow">
                        <X className="h-5 w-5" />
                      </button>
                      <button onClick={prev} disabled={lightboxIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={next} disabled={lightboxIndex >= (archivos.length - 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Adjunto ${lightboxIndex + 1}`} className="max-h-[90vh] max-w-full object-contain" />
                      </div>
                      <div className="mt-2 text-center text-sm text-white">
                        {lightboxIndex + 1} / {archivos.length}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : null}

            {reclamo.categoria && (
              <div>
                <label className="text-sm font-medium text-gray-600">Categoría</label>
                <p className="text-sm mt-1">{reclamo.categoria}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Fecha de Creación</label>
                <p className="text-sm mt-1">{new Date(reclamo.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              {reclamo.otReferencia && (
                <div>
                  <label className="text-sm font-medium text-gray-600">OT de Referencia</label>
                  <p className="text-sm mt-1 font-mono bg-blue-50 p-2 rounded">{reclamo.otReferencia.codigo}</p>
                </div>
              )}
            </div>

            {reclamo.tipoResolucion && (
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <label className="text-sm font-medium text-green-900">Tipo de Resolución</label>
                <p className="text-sm mt-1 text-green-900">{reclamo.tipoResolucion.replace('_', ' ')}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button
                variant="outline"
                onClick={() => reclamo && exportToPDF(reclamo)}
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              {canApprove && reclamo.estado === 'PENDING' && (
                <Button
                  onClick={onApprove}
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
  );
}