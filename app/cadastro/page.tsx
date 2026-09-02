import type { Metadata } from 'next';

import { getSettings } from '@/lib/server/store';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignupForm } from '@/components/auth/signup-form';

// A tela reflete a chave "permitir cadastro público" das configurações, então
// não pode ser congelada no build.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Abra sua conta no Lerich Finance.',
};

export default async function SignupPage() {
  const settings = await getSettings();

  return (
    <AuthShell>
      <SignupForm cadastroAberto={settings.permitirCadastroPublico} />
    </AuthShell>
  );
}
