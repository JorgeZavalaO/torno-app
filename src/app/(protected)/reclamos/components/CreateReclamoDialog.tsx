'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Cliente {
  id: string;
  nombre: string;
}

interface OT {
  id: string;
  codigo: string;
  estado: string;
  prioridad: string;
  cliente?: { nombre: string } | null;
  createdAt: string;
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

interface CreateReclamoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: Cliente[];
  ots: OT[];
  onCreate: (formData: CreateReclamoForm, files: File[]) => Promise<void>;
}

export default function CreateReclamoDialog({
  open,
  onOpenChange,
  clientes,
  ots,
  onCreate
}: CreateReclamoDialogProps) {
  const [createForm, setCreateForm] = useState({
    clienteId: '',
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA',
    categoria: '',
    tipoReclamo: 'NUEVO_RECLAMO',
    otReferenciaId: '',
    archivos: [] as string[],
  });

  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ clienteId?: string; titulo?: string; descripcion?: string; otReferenciaId?: string }>({});
  const [clienteOpen, setClienteOpen] = useState(false);
  const [otOpen, setOtOpen] = useState(false);

  const TITLE_MAX = 200;
  const DESC_MAX = 1000;

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setCreateForm({
        clienteId: '',
        titulo: '',
        descripcion: '',
        prioridad: 'MEDIA',
        categoria: '',
        tipoReclamo: 'NUEVO_RECLAMO',
        otReferenciaId: '',
        archivos: [],
      });
      setLocalFiles([]);
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    // Validar archivos
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede 2MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        continue;
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" no es JPG, PNG, WebP o PDF`);
        continue;
      }
      validFiles.push(file);
    }
    setLocalFiles(validFiles);
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});

    // Inline validation
    const newErrors: typeof errors = {};
    if (!createForm.clienteId) newErrors.clienteId = 'Cliente requerido';
    if (!createForm.titulo || createForm.titulo.trim().length === 0) newErrors.titulo = 'Título requerido';
    else if (createForm.titulo.length > TITLE_MAX) newErrors.titulo = `Máximo ${TITLE_MAX} caracteres`;
    if (!createForm.descripcion || createForm.descripcion.trim().length === 0) newErrors.descripcion = 'Descripción requerida';
    else if (createForm.descripcion.length > DESC_MAX) newErrors.descripcion = `Máximo ${DESC_MAX} caracteres`;
    if (createForm.tipoReclamo === 'OT_ATENDIDA' && !createForm.otReferenciaId) newErrors.otReferenciaId = 'Selecciona una OT de referencia';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(createForm, localFiles);
      onOpenChange(false);
    } catch {
      // Error handling is done in parent component
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCliente = clientes.find(c => c.id === createForm.clienteId);
  const selectedOT = ots.find(ot => ot.id === createForm.otReferenciaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Reclamo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Cliente</label>
              <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteOpen}
                    className="w-full justify-between"
                  >
                    {selectedCliente ? selectedCliente.nombre : "Selecciona cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                    <CommandGroup>
                      <CommandList className="max-h-60">
                        {clientes.filter(cliente => cliente.id && cliente.nombre).map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            value={cliente.nombre}
                            onSelect={() => {
                              setCreateForm(prev => ({ ...prev, clienteId: cliente.id }));
                              setClienteOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                createForm.clienteId === cliente.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cliente.nombre}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.clienteId && <div className="text-xs text-red-600 mt-1">{errors.clienteId}</div>}
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
              <Popover open={otOpen} onOpenChange={setOtOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={otOpen}
                    className="w-full justify-between"
                  >
                    {selectedOT ? `${selectedOT.codigo} - ${selectedOT.cliente?.nombre}` : "Selecciona OT..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar OT..." />
                    <CommandEmpty>No se encontraron OTs.</CommandEmpty>
                    <CommandGroup>
                      <CommandList className="max-h-60">
                        {ots.filter(ot => ot.id && ot.codigo && ot.cliente?.nombre).map((ot) => (
                          <CommandItem
                            key={ot.id}
                            value={`${ot.codigo} ${ot.cliente?.nombre}`}
                            onSelect={() => {
                              setCreateForm(prev => ({ ...prev, otReferenciaId: ot.id }));
                              setOtOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                createForm.otReferenciaId === ot.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {ot.codigo} - {ot.cliente?.nombre}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.otReferenciaId && <div className="text-xs text-red-600 mt-1">{errors.otReferenciaId}</div>}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              value={createForm.titulo}
              onChange={(e) => setCreateForm(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Título del reclamo"
            />
            <div className="text-xs text-gray-500 mt-1">{createForm.titulo.length}/{TITLE_MAX} caracteres</div>
            {errors.titulo && <div className="text-xs text-red-600 mt-1">{errors.titulo}</div>}
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={createForm.descripcion}
              onChange={(e) => setCreateForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Describe el problema o reclamo..."
              rows={4}
            />
            <div className="text-xs text-gray-500 mt-1">{createForm.descripcion.length}/{DESC_MAX} caracteres</div>
            {errors.descripcion && <div className="text-xs text-red-600 mt-1">{errors.descripcion}</div>}
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

          {/* Archivos - Mejorado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Adjuntar archivos (opcional)</label>
            <p className="text-xs text-gray-500">Máx 2MB por archivo. Se aceptan: imágenes (JPG, PNG, WebP) y PDF</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="w-full"
              />
            </div>

            {/* Lista de archivos seleccionados */}
            {localFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">{localFiles.length} archivo(s) seleccionado(s)</p>
                {localFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="text-2xl">
                        {f.type.includes('pdf') ? '📄' : f.type.includes('image') ? '🖼️' : '📎'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-gray-500">{(f.size / 1024 / 1024).toFixed(2)}MB</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setLocalFiles(localFiles.filter((_, idx) => idx !== i))}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !createForm.clienteId || !createForm.titulo || !createForm.descripcion || (createForm.tipoReclamo === 'OT_ATENDIDA' && !createForm.otReferenciaId)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <span className="flex items-center"><Loader2 className="animate-spin h-4 w-4 mr-2" /> Creando...</span>
              ) : 'Crear Reclamo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}