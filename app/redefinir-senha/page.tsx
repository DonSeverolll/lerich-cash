import type { Metadata } from 'next';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

import { checkPasswordReset } from '@/lib/server/store';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Nova senha',
  description: 'Defina uma nova senha para sua conta.',
};

const motivos = {
  INVALIDO: 'Este link não é válido. Ele pode ter sido digitado errado ou substituído por um mais recente.',
  EXPIRADO: 'Este link expirou. Cada link de recuperação vale por 1 hora.',
  USADO: 'Este link já foi usado. Por segurança, cada link só funciona uma vez.',
} as const;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verificacao = token
    ? await checkPasswordReset(token)
    : ({ ok: false, reason: 'INVALIDO' } as const);

  return (
    <AuthShell>
      {verificacao.ok ? (
        <ResetPasswordForm token={token as string} nome={verificacao.user.nome.split(' ')[0] ?? ''} />
      ) : (
        <Card className="animate-fade-up border-gold-500/20 bg-onyx-950/70 backdrop-blur">
          <CardContent className="p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-aviso-500/30 bg-aviso-500/10 text-aviso-200">
              <TriangleAlert className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-onyx-50">Link indisponível</h2>
            <p className="mt-2 text-sm leading-relaxed text-onyx-400">{motivos[verificacao.reason]}</p>

            <div className="mt-7 space-y-3">
              <Button asChild className="w-full">
                <Link href="/recuperar-senha">Pedir um novo link</Link>
              </Button>
              <Button asChild variant="subtle" className="w-full">
                <Link href="/login">Voltar para o acesso</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AuthShell>
  );
}
