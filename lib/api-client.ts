/** Chamadas às rotas de API a partir das telas, com erro já traduzido. */

export type RespostaApi<T> = { ok: true; dados: T } | { ok: false; erro: string };

export async function chamarApi<T>(url: string, init?: RequestInit): Promise<RespostaApi<T>> {
  try {
    const resposta = await fetch(url, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
    });

    const dados = (await resposta.json().catch(() => ({}))) as T & { error?: string };

    if (!resposta.ok) {
      return { ok: false, erro: dados.error ?? 'Não foi possível concluir a operação.' };
    }

    return { ok: true, dados };
  } catch {
    return { ok: false, erro: 'Falha de conexão. Verifique sua rede e tente novamente.' };
  }
}

/** Data ISO -> `aaaa-mm-dd`, formato aceito pelo input de data. */
export function paraInputData(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** `aaaa-mm-dd` -> ISO ao meio-dia, evitando virar o dia por fuso. */
export function deInputData(valor: string): string {
  const [ano, mes, dia] = valor.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0).toISOString();
}
