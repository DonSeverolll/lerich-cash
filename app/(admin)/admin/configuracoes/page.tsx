import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/auth/server';
import { getSettings } from '@/lib/server/store';
import { AdminSettingsView } from '@/components/admin/admin-settings-view';

export const metadata: Metadata = { title: 'Configurações' };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return <AdminSettingsView initialSettings={settings} />;
}
