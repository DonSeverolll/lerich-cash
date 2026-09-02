import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDate(date: Date | string) {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

/**
 * Mostra só uma fração do e-mail, o bastante para o dono reconhecer sem expor
 * o endereço: `alejandro.lima@dcastro.adv.br` -> `al••••••••@dc•••••.adv.br`.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '•••';

  const mascara = (trecho: string, visiveis: number) =>
    trecho.length <= visiveis
      ? `${trecho[0] ?? ''}${'•'.repeat(Math.max(1, trecho.length - 1))}`
      : `${trecho.slice(0, visiveis)}${'•'.repeat(Math.min(8, trecho.length - visiveis))}`;

  const partes = domain.split('.');
  const nome = partes.shift() ?? '';
  const sufixo = partes.length ? `.${partes.join('.')}` : '';

  return `${mascara(local, 2)}@${mascara(nome, 2)}${sufixo}`;
}
