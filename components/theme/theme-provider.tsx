'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

export type Tema = 'escuro' | 'claro';

export const CHAVE_TEMA = 'lerich-tema';

interface ContextoTema {
  tema: Tema;
  alternar: () => void;
  trocando: boolean;
}

const Contexto = createContext<ContextoTema | null>(null);

/**
 * Duração da cortina; a paleta troca na metade, quando a tela está coberta.
 * Sob "reduzir movimento" a cortina não varre — dá um clarão curto —, então o
 * ciclo é bem mais rápido. A troca de tema é uma ação pedida pelo usuário, não
 * um movimento ambiente, por isso ela continua tendo um retorno visual.
 */
const DURACAO_MS = 780;
const DURACAO_REDUZIDA_MS = 260;

/*
  O atributo `data-tema` do <html> é a fonte da verdade: o script inline do
  layout o define antes da primeira pintura, e este provider apenas o lê e o
  escreve. Com `useSyncExternalStore` o React usa o valor do servidor durante a
  hidratação e troca para o valor real em seguida, sem divergência.
*/

function assinar(aoMudar: () => void): () => void {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  return () => observador.disconnect();
}

function temaNoDocumento(): Tema {
  return document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro';
}

/** No servidor não há como saber a escolha do visitante; assumimos o padrão. */
function temaNoServidor(): Tema {
  return 'escuro';
}

function aplicar(tema: Tema) {
  document.documentElement.dataset.tema = tema;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const tema = useSyncExternalStore(assinar, temaNoDocumento, temaNoServidor);
  const [trocando, setTrocando] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const alternar = useCallback(() => {
    if (trocando) return;

    const proximo: Tema = tema === 'escuro' ? 'claro' : 'escuro';

    try {
      window.localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // Navegação privada ou armazenamento bloqueado: a escolha vale só nesta visita.
    }

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duracao = reduzido ? DURACAO_REDUZIDA_MS : DURACAO_MS;

    // A cortina é um elemento solto: entra pela direita, cobre e sai pela esquerda.
    const cortina = document.createElement('div');
    cortina.className = 'cortina-tema';
    cortina.dataset.para = proximo;
    cortina.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cortina);

    setTrocando(true);
    timers.current.push(
      window.setTimeout(() => aplicar(proximo), duracao / 2),
      window.setTimeout(() => {
        cortina.remove();
        setTrocando(false);
      }, duracao),
    );
  }, [tema, trocando]);

  // Sem escolha salva, acompanha a preferência do sistema se ela mudar.
  useEffect(() => {
    let salvo: string | null = null;
    try {
      salvo = window.localStorage.getItem(CHAVE_TEMA);
    } catch {
      salvo = null;
    }
    if (salvo) return;

    const consulta = window.matchMedia('(prefers-color-scheme: light)');
    const aoMudar = () => aplicar(consulta.matches ? 'claro' : 'escuro');
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  const valor = useMemo(() => ({ tema, alternar, trocando }), [tema, alternar, trocando]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): ContextoTema {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useTema precisa estar dentro de ThemeProvider.');
  return contexto;
}

/**
 * Script executado antes da pintura: aplica o tema salvo (ou a preferência do
 * sistema) direto no <html>, evitando o flash de tema errado no carregamento.
 */
export const SCRIPT_TEMA = `(function(){try{var s=localStorage.getItem('${CHAVE_TEMA}');var c=s||(window.matchMedia('(prefers-color-scheme: light)').matches?'claro':'escuro');document.documentElement.dataset.tema=c==='claro'?'claro':'escuro';}catch(e){document.documentElement.dataset.tema='escuro';}})();`;
