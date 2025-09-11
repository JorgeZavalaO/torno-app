import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { getCurrentUser } from '@/app/lib/auth';
import { getUserPermissionCodes } from '@/app/lib/rbac';

export async function GET() {
  // Solo habilitar en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const session = await auth();
    const currentUser = await getCurrentUser();

    let perms: string[] = [];
    if (currentUser?.email) {
      // getUserPermissionCodes devuelve string[] (cacheada)
      perms = await getUserPermissionCodes(currentUser.email);
    }

    return NextResponse.json({
      env: process.env.NODE_ENV ?? null,
      session: session ?? null,
      currentUser: currentUser ?? null,
      permissionCodes: perms,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}