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
 * A duração da cortina é lida da própria CSS depois que o elemento entra no
 * documento. Antes havia duas constantes aqui repetindo os valores da folha de
 * estilo, e sob "reduzir movimento" elas saíam de sincronia: a paleta trocava
 * enquanto a cortina já estava transparente, e dava para ver a interface
 * inteira mudar de cor. Com a leitura direta existe uma fonte da verdade só, e
 * a regra vale para qualquer variante — inclusive as de media query.
 *
 * A troca de tema é uma ação pedida pelo usuário, não um movimento ambiente,
 * por isso ela continua tendo retorno visual mesmo com movimento reduzido.
 */
const DURACAO_DE_SEGURANCA_MS = 1170;

/** Lê `animation-duration` (ex.: "1.17s", "390ms") em milissegundos. */
function duracaoDaAnimacao(elemento: HTMLElement): number {
  const bruto = window.getComputedStyle(elemento).animationDuration.split(',')[0]?.trim() ?? '';
  const numero = Number.parseFloat(bruto);
  if (!Number.isFinite(numero) || numero <= 0) return 0;
  return bruto.endsWith('ms') ? numero : numero * 1000;
}

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

    // A cortina é um elemento solto: entra pela direita, cobre e sai pela esquerda.
    const cortina = document.createElement('div');
    cortina.className = 'cortina-tema';
    cortina.dataset.para = proximo;
    cortina.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cortina);

    const duracao = duracaoDaAnimacao(cortina) || DURACAO_DE_SEGURANCA_MS;

    // Sem animação (extensão, impressão, `animation: none`) não há o que
    // esperar: troca na hora, senão o usuário ficaria olhando uma tela coberta.
    if (!duracaoDaAnimacao(cortina)) {
      cortina.remove();
      aplicar(proximo);
      return;
    }

    setTrocando(true);
    timers.current.push(
      // A paleta troca no meio do ciclo, quando a cortina está cobrindo.
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
