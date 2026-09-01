import { requireAdmin } from '@/lib/auth/server';
import { AppShell } from '@/components/shell/app-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <AppShell variant="admin" user={user}>
      {children}
    </AppShell>
  );
}
