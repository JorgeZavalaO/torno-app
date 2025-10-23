import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

type UploadFile = {
  name: string;
  base64: string;
  mimeType: string;
  size: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const files: UploadFile[] = body.files || [];

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    // Validate each file
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Archivo "${f.name}" excede el tamaño máximo de 2MB` },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIME_TYPES.includes(f.mimeType)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${f.mimeType}. Solo se aceptan imágenes (JPEG, PNG, WebP) y PDF` },
          { status: 400 }
        );
      }
    }

    const urls: string[] = [];

    for (const f of files) {
      // Strip data:mime/type;base64, prefix if present
      const base64Data = f.base64.includes('base64,') ? f.base64.split('base64,')[1] : f.base64;
      const buffer = Buffer.from(base64Data, 'base64');

      // Sanitize filename
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const fileName = `reclamo-${timestamp}-${safeName}`;

      // Upload to Vercel Blob
      const blob = await put(fileName, buffer, {
        contentType: f.mimeType,
        access: 'public',
      });

      urls.push(blob.url);
    }

    return NextResponse.json({ files: urls });
  } catch (err) {
    console.error('Upload error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al subir archivo: ${message}` }, { status: 500 });
  }
}
