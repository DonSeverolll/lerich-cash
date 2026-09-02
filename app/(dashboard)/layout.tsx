import { TriangleAlert } from 'lucide-react';

import { requireSession } from '@/lib/auth/server';
import { getSettings } from '@/lib/server/store';
import { AppShell } from '@/components/shell/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireSession('/dashboard'), getSettings()]);

  return (
    <AppShell variant="client" user={user}>
      {settings.avisoManutencao ? (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-aviso-500/25 bg-aviso-500/10 p-4 text-sm text-aviso-100"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{settings.avisoManutencao}</p>
        </div>
      ) : null}
      {children}
    </AppShell>
  );
}
