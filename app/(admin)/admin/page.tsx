import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/auth/server';
import { listAudit, listUsers, resumoGlobal, storeDriver } from '@/lib/server/store';
import { AdminOverview } from '@/components/admin/admin-overview';

export const metadata: Metadata = { title: 'Visão geral' };

export default async function AdminHomePage() {
  await requireAdmin();
  const [users, audit, resumo] = await Promise.all([listUsers(), listAudit(8), resumoGlobal()]);

  return <AdminOverview users={users} audit={audit} driver={storeDriver()} resumo={resumo} />;
}
