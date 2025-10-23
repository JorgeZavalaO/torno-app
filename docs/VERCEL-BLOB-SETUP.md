# Configuración de Vercel Blob Storage

## Descripción

El sistema de reclamos ahora utiliza **Vercel Blob Storage** para almacenar archivos adjuntos (imágenes y PDFs). Esto reemplaza el almacenamiento local en el sistema de archivos.

## Requisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Proyecto registrado en Vercel Console
3. Token de acceso para Vercel Blob

## Pasos de Configuración

### 1. Obtener el Token de Vercel Blob

1. Ve a [Vercel Console](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Storage** en el menú lateral
4. Haz clic en **Create** → **Blob**
5. Dale un nombre a tu almacenamiento (ej: `torno-reclamos-files`)
6. Copia el token de lectura/escritura (`BLOB_READ_WRITE_TOKEN`)

### 2. Configurar Variables de Entorno

Agrega el token a tu archivo `.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=your_token_here
```

### 3. Estructura de Archivos

Los archivos subidos se organizan así:
- Ubicación: Vercel Blob Storage (URLs públicas)
- Prefijo: `reclamo-{timestamp}-{filename}`
- Formato: Preserva la extensión original del archivo

### 4. Tipos de Archivo Permitidos

**Imágenes:**
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/webp` (.webp)

**Documentos:**
- `application/pdf` (.pdf)

### 5. Límites

- **Tamaño máximo por archivo:** 2MB
- **Total por reclamo:** Sin límite (pero se recomienda máximo 10MB por reclamo)
- **Validación:** Se realiza tanto en cliente como en servidor

## Flujo de Subida

```
1. Usuario selecciona archivo(s) en el diálogo
   ↓
2. Cliente valida:
   - Tamaño ≤ 2MB
   - Tipo MIME permitido
   - Muestra errores inline si no pasa
   ↓
3. Si validación OK, usuario hace clic "Crear Reclamo"
   ↓
4. Cliente codifica archivos en base64
   ↓
5. Envía a /api/uploads/reclamos
   ↓
6. Servidor valida nuevamente (defensa en profundidad)
   ↓
7. Servidor sube a Vercel Blob
   ↓
8. Recibe URLs públicas
   ↓
9. Crea reclamo con URLs de archivos en array `archivos`
```

## Testing Local

### Con Vercel CLI (Recomendado)

1. Instala Vercel CLI:
```bash
npm install -g vercel
```

2. Auténtica:
```bash
vercel login
```

3. Vincula tu proyecto:
```bash
vercel link
```

4. Descarga env vars:
```bash
vercel env pull
```

Esto crea `.env.local` con `BLOB_READ_WRITE_TOKEN` automáticamente.

### Pruebas Manuales

1. Inicia el servidor local:
```bash
pnpm dev
```

2. Ve a `/reclamos`

3. Haz clic en "Crear Nuevo Reclamo"

4. Adjunta un archivo (JPG, PNG, WebP o PDF)

5. Verifica que:
   - Se muestre el archivo con su tamaño
   - Se pueda eliminar con el botón X
   - Se valide tamaño y tipo

6. Haz clic "Crear Reclamo"

7. Verifica en Vercel Console → Storage → Browser que el archivo aparezca

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is required"

**Causa:** Token no configurado en `.env.local`

**Solución:**
```bash
vercel env pull
```

### Error: "Archivo excede el tamaño máximo"

**Causa:** El archivo es > 2MB

**Solución:** Comprimir imagen o usar versión PDF optimizada

### Error: "Tipo de archivo no permitido"

**Causa:** Formato no soportado (ej: .doc, .xlsx, .mp4)

**Solución:** Convertir a JPG, PNG, WebP o PDF

### Archivos no aparecen en Vercel Console

**Causa:** Token sin permisos o expirado

**Solución:** Regenerar token en Vercel Console

## Costos

Vercel Blob tiene un plan gratuito:
- **100GB/mes** gratis (incluido en free tier)
- **$0.40/GB** después

Para ver uso actual: Vercel Console → Storage → Usage

## Documentación Oficial

- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Upload Example](https://vercel.com/docs/storage/vercel-blob/nextjs-upload-examples)

