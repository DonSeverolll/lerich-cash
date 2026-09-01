import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/auth/server';
import { listUsers } from '@/lib/server/store';
import { AdminUsersView } from '@/components/admin/admin-users-view';

export const metadata: Metadata = { title: 'Usuários' };

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const users = await listUsers();

  return <AdminUsersView initialUsers={users} currentUserId={session.id} />;
}
