import type { Metadata } from 'next';

import { requireSession } from '@/lib/auth/server';
import { findUserById } from '@/lib/server/store';
import { ProfileView } from '@/components/profile-view';

export const metadata: Metadata = { title: 'Meu perfil' };

export default async function ProfilePage() {
  const session = await requireSession('/perfil');
  const stored = await findUserById(session.id);

  return (
    <ProfileView
      session={session}
      email={stored?.email ?? ''}
      plano={stored?.plano ?? 'FREE'}
      criadoEm={stored?.created_at ?? null}
      ultimoAcesso={stored?.last_login_at ?? null}
    />
  );
}
