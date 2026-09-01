import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/auth/server';
import { isPersistenceAvailable, listAudit, listUsers } from '@/lib/server/store';
import { AdminOverview } from '@/components/admin/admin-overview';

export const metadata: Metadata = { title: 'Visão geral' };

export default async function AdminHomePage() {
  await requireAdmin();
  const [users, audit] = await Promise.all([listUsers(), listAudit(8)]);

  return <AdminOverview users={users} audit={audit} persistente={isPersistenceAvailable()} />;
}
