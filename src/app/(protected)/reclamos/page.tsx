import { getCurrentUser } from '@/app/lib/auth';
import { userHasPermission } from '@/app/lib/rbac';
import { redirect } from 'next/navigation';
import ReclamosClient from './reclamos.client';

export default async function ReclamosPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/handler/sign-in');

  const canRead = await userHasPermission(me.email, 'reclamos.read');
  const canWrite = await userHasPermission(me.email, 'reclamos.write');
  const canApprove = await userHasPermission(me.email, 'reclamos.approve');

  if (!canRead) redirect('/');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Reclamos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Administra los reclamos de clientes y conviértelos en órdenes de trabajo cuando sea necesario.
          </p>
        </div>

        <ReclamosClient canWrite={canWrite} canApprove={canApprove} />
      </div>
    </div>
  );
}