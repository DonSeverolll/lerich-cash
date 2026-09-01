import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/auth/server';
import { listAudit } from '@/lib/server/store';
import { AdminAuditView } from '@/components/admin/admin-audit-view';

export const metadata: Metadata = { title: 'Auditoria' };

export default async function AdminAuditPage() {
  await requireAdmin();
  const logs = await listAudit(200);

  return <AdminAuditView logs={logs} />;
}
